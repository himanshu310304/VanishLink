// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();

const Link = require('../models/Link');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const { getBlockedIPs, getSuspiciousActivity, blockIP, unblockIP } = require('../middleware/ipBlocker');
const { auditLogger, createAuditLog } = require('../middleware/auditLogger');

// GET /api/admin/overview
// Returns system-wide aggregate metrics for the admin dashboard
router.get('/overview', async (req, res) => {
  try {
    // Basic counts from DB
    const [totalLinks, activeLinks, clickAgg, uniqueIps] = await Promise.all([
      Link.countDocuments({}),
      Link.countDocuments({ status: 'active' }),
      AnalyticsEvent.aggregate([
        {
          $group: {
            _id: null,
            totalClicks: { $sum: 1 },
            mobileClicks: {
              $sum: {
                $cond: [{ $eq: ['$deviceType', 'mobile'] }, 1, 0],
              },
            },
          },
        },
      ]),
      AnalyticsEvent.distinct('ip'),
    ]);

    const totalClicks = clickAgg[0]?.totalClicks ?? 0;
    const mobileClicks = clickAgg[0]?.mobileClicks ?? 0;
    const uniqueVisitors = uniqueIps.length;
    const mobilePercent =
      totalClicks > 0
        ? Math.round((mobileClicks / totalClicks) * 100)
        : 0;

    // Clicks over last 7 days
    const since = new Date();
    since.setDate(since.getDate() - 6); // last 7 days including today

    const timelineAgg = await AnalyticsEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const timeline = timelineAgg.map((row) => ({
      date: row._id,
      clicks: row.clicks,
    }));

    // "Recent system alerts" – for now, use recent analytics events
    const recentEventsRaw = await AnalyticsEvent.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('slug ip country createdAt');

    const recentEvents = recentEventsRaw.map((ev) => ({
      id: ev._id.toString(),
      message: `Link /${ev.slug} clicked from ${
        ev.country || 'Unknown'
      } (${ev.ip || 'unknown IP'})`,
      createdAt: ev.createdAt,
    }));

    // 🔎 NEW: log that an admin viewed the overview dashboard
    if (req.user) {
      await createAuditLog('SYSTEM_EVENT', req.user, 'VIEW_ADMIN_OVERVIEW', {
        ip: req.ip,
        totalLinks,
        totalClicks,
      });
    }

    res.json({
      totalLinks,
      totalClicks,
      activeLinks,
      uniqueVisitors,
      mobilePercent,
      timeline,
      recentEvents,
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ message: 'Failed to load admin overview' });
  }
});

// GET /api/admin/audit-logs
// Fetch audit logs with pagination and filtering
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      adminId,
      startDate,
      endDate,
    } = req.query;

    const query = {};
    
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      logs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Audit logs fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

// GET /api/admin/settings
// Get current system settings
router.get('/settings', async (req, res) => {
  try {
    console.log('Fetching system settings...');
    console.log('User:', req.user);
    
    let settings = await SystemSettings.getSettings();
    
    console.log('Settings fetched:', settings ? 'Found' : 'Not found');
    res.json(settings);
  } catch (err) {
    console.error('Settings fetch error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Failed to fetch settings',
      error: err.message 
    });
  }
});

// PATCH /api/admin/settings
// Update system settings
router.patch('/settings', async (req, res) => {
  try {
    console.log('Updating system settings...');
    console.log('User:', req.user);
    console.log('Updates:', req.body);
    
    const adminId = req.user?.sub || req.user?._id; // JWT uses 'sub'
    const updates = req.body;
    
    const settings = await SystemSettings.updateSettings(updates, adminId);
    console.log('Settings updated in DB');
    
    // Broadcast settings reload to all middleware
    const io = req.app.get('io');
    if (io) {
      io.emit('settings:reload');
    }
    
    // Create audit log manually after successful update
    if (req.user) {
      try {
        const auditData = {
          action: 'UPDATE_SETTINGS',
          adminId: req.user.sub || req.user._id,
          adminEmail: req.user.email,
          adminName: req.user.name || req.user.email,
          target: 'System configuration',
          details: { updates },
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        };
        console.log('Creating audit log with:', auditData);
        
        await AuditLog.create(auditData);
        console.log('✅ Audit log created for settings update');
      } catch (auditErr) {
        console.error('Audit log failed:', auditErr.message);
        console.error('Audit error stack:', auditErr.stack);
      }
    } else {
      console.log('⚠️ No req.user found, audit log skipped');
    }
    
    console.log('Settings updated successfully');
    
    // Trigger immediate reload in middleware
    if (global.reloadSettings) {
      await global.reloadSettings();
      console.log('🔄 Middleware settings reloaded immediately');
    }
    
    res.json(settings);
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ 
      message: 'Failed to update settings',
      error: err.message 
    });
  }
});

// POST /api/admin/settings/reload
// Manually trigger settings reload (for testing)
router.post('/settings/reload', async (req, res) => {
  try {
    if (global.reloadSettings) {
      await global.reloadSettings();
      res.json({ message: 'Settings reloaded successfully' });
    } else {
      res.json({ message: 'Reload function not available' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to reload settings' });
  }
});

// GET /api/admin/security/blocked-ips
// Get list of blocked IPs
router.get('/security/blocked-ips', async (req, res) => {
  try {
    const blockedIPs = getBlockedIPs();
    const suspicious = getSuspiciousActivity();
    
    res.json({
      blockedIPs,
      suspiciousActivity: suspicious,
    });
  } catch (err) {
    console.error('Blocked IPs fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch blocked IPs' });
  }
});

// POST /api/admin/security/block-ip
// Manually block an IP
router.post('/security/block-ip',
  auditLogger('BLOCK_IP', (req) => `IP: ${req.body.ip}`),
  
  async (req, res) => {
    try {
      const { ip } = req.body;
      
      if (!ip) {
        return res.status(400).json({ message: 'IP address required' });
      }
      
      blockIP(ip);
      res.json({ success: true, message: `IP ${ip} has been blocked` });
    } catch (err) {
      console.error('Block IP error:', err);
      res.status(500).json({ message: 'Failed to block IP' });
    }
  }
);

// POST /api/admin/security/unblock-ip
// Manually unblock an IP
router.post('/security/unblock-ip',
  auditLogger('UNBLOCK_IP', (req) => `IP: ${req.body.ip}`),
  async (req, res) => {
    try {
      const { ip } = req.body;
      
      if (!ip) {
        return res.status(400).json({ message: 'IP address required' });
      }
      
      unblockIP(ip);
      res.json({ success: true, message: `IP ${ip} has been unblocked` });
    } catch (err) {
      console.error('Unblock IP error:', err);
      res.status(500).json({ message: 'Failed to unblock IP' });
    }
  }
);

module.exports = router;
