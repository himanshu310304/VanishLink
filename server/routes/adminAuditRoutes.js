// server/routes/adminAuditRoutes.js
const express = require('express');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

/**
 * GET /api/admin/audit-logs
 * Query:
 *  - page (default 1)
 *  - limit (default 20)
 *  - action (optional exact match)
 *  - admin (optional fuzzy search on adminName)
 *  - search (optional search in target)
 */
router.get('/', async (req, res) => {
  try {
    let {
      page = 1,
      limit = 20,
      action,
      admin,
      search,
    } = req.query;

    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 20;

    const query = {};

    if (action && action.trim()) {
      query.action = action.trim();
    }

    if (admin && admin.trim()) {
      query.adminName = new RegExp(admin.trim(), 'i');
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.target = regex;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error in GET /api/admin/audit-logs:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/links/rescan-safety
 * Re-run the heuristic safety scanner for links that have
 * no safetyScore yet (or null), and store safetyScore + safetyVerdict.
 */
router.post('/rescan-safety', async (req, res) => {
  try {
    const { onlyMissing = true } = req.body || {};

    const query = onlyMissing
      ? {
          $or: [
            { safetyScore: { $exists: false } },
            { safetyScore: null },
          ],
        }
      : {}; // if you ever want to rescan *everything*

    const links = await Link.find(query);
    if (!links.length) {
      return res.json({
        success: true,
        updatedCount: 0,
        message: 'No links needed safety rescan',
      });
    }

    let updatedCount = 0;
    const now = new Date();

    for (const link of links) {
      const safety = basicUrlSafetyCheck(link.targetUrl);

      link.safetyScore = safety.score;
      link.safetyVerdict = safety.verdict;
      link.isFlagged = safety.flagRecommended || link.isFlagged;
      if (safety.flagRecommended) {
        link.flagReason =
          link.flagReason || 'auto_flag_safety_scanner_rescan';
        link.flaggedAt = link.flaggedAt || now;
        link.moderationStatus =
          link.moderationStatus === 'removed'
            ? link.moderationStatus
            : 'flagged';
      }

      await link.save();
      updatedCount += 1;
    }

    await logAuditEvent({
      action: 'RESCAN_LINK_SAFETY',
      target: `links: ${updatedCount}`,
      adminName: 'Admin Console',
      ipAddress: req.ip,
      metadata: {
        onlyMissing,
        updatedCount,
      },
    });

    res.json({
      success: true,
      updatedCount,
    });
  } catch (err) {
    console.error('Error in POST /api/admin/links/rescan-safety:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router; // <-- keep this as the last line

