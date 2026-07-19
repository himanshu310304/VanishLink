const express = require('express');
const router = express.Router();
const FlagReport = require('../models/FlagReport');
const Link = require('../models/Link');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('./authRoutes');

// Middleware to require admin role
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: `${role} access required` });
    }
    next();
  };
};

// Submit a flag/report (authenticated users only)
router.post('/report', authenticate, async (req, res) => {
  try {
    const { linkId, reason, description } = req.body;

    if (!linkId || !reason || !description) {
      return res.status(400).json({ 
        message: 'Link ID, reason, and description are required' 
      });
    }

    // Verify link exists
    const link = await Link.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Auto-escalate certain reasons to HIGH priority
    const highPriorityReasons = ['MALWARE', 'PHISHING', 'ILLEGAL_CONTENT'];
    const priority = highPriorityReasons.includes(reason) ? 'HIGH' : 'MEDIUM';

    const reportedBy = req.user?.sub || req.user?._id;
    console.log('📝 Creating report with reportedBy:', reportedBy);
    console.log('👤 req.user:', req.user);

    const report = new FlagReport({
      linkId,
      reportedBy: reportedBy,
      reporterEmail: req.user?.email,
      reason,
      description,
      priority,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await report.save();
    console.log('✅ Report saved with ID:', report._id, 'reportedBy:', report.reportedBy);

    res.status(201).json({ 
      message: 'Report submitted successfully',
      reportId: report._id
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ message: 'Failed to submit report' });
  }
});

// Get user's own reports
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?._id;
    console.log('🔍 Fetching reports for user:', userId);
    console.log('👤 req.user:', req.user);
    
    const reports = await FlagReport.find({ reportedBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    console.log('📊 Found reports:', reports.length);
    if (reports.length > 0) {
      console.log('📦 Sample report reportedBy:', reports[0].reportedBy);
    }

    // Fetch link details for each report
    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const link = await Link.findById(report.linkId).select('slug title targetUrl status');
        return {
          ...report,
          linkDetails: link || null
        };
      })
    );

    res.json(reportsWithDetails);
  } catch (error) {
    console.error('❌ Error fetching user reports:', error);
    res.status(500).json({ message: 'Failed to fetch your reports' });
  }
});

// Get all reports (admin only)
router.get('/reports', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      reason,
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (reason) query.reason = reason;

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      FlagReport.find(query)
        .populate('linkId', 'slug originalUrl createdBy status')
        .populate('reportedBy', 'email username')
        .populate('reviewedBy', 'email username')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FlagReport.countDocuments(query)
    ]);

    res.json({
      reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// Get report statistics (admin only)
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [
      totalReports,
      pendingReports,
      underReview,
      highPriority
    ] = await Promise.all([
      FlagReport.countDocuments(),
      FlagReport.countDocuments({ status: 'PENDING' }),
      FlagReport.countDocuments({ status: 'UNDER_REVIEW' }),
      FlagReport.countDocuments({ priority: 'HIGH', status: { $in: ['PENDING', 'UNDER_REVIEW'] } })
    ]);

    res.json({
      totalReports,
      pendingReports,
      underReview,
      highPriority
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Review a report (admin only)
router.patch('/reports/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes, actionTaken } = req.body;

    const report = await FlagReport.findById(id).populate('linkId');
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Update report
    report.status = status || report.status;
    report.reviewNotes = reviewNotes;
    report.actionTaken = actionTaken || report.actionTaken;
    report.reviewedBy = req.user.sub || req.user._id;
    report.reviewedAt = new Date();

    await report.save();

    // Take action on the link if specified
    if (actionTaken === 'BLOCKED' && report.linkId) {
      report.linkId.status = 'blocked';
      await report.linkId.save();
    } else if (actionTaken === 'DELETED' && report.linkId) {
      await Link.findByIdAndDelete(report.linkId._id);
    }

    // Create audit log
    await AuditLog.create({
      action: status === 'APPROVED' ? 'APPROVE_REPORT' : 'REJECT_REPORT',
      adminId: req.user.sub || req.user._id,
      adminEmail: req.user.email,
      adminName: req.user.username || req.user.email,
      target: 'flagreport',
      targetId: report._id,
      details: {
        linkId: report.linkId?._id,
        reason: report.reason,
        actionTaken,
        reviewNotes
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ 
      message: 'Report reviewed successfully',
      report 
    });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ message: 'Failed to review report' });
  }
});

// Bulk action on reports (admin only)
router.post('/reports/bulk', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { reportIds, action, reviewNotes } = req.body;

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ message: 'Report IDs array is required' });
    }

    if (!['APPROVE', 'REJECT', 'DELETE_LINKS', 'BLOCK_LINKS'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const reports = await FlagReport.find({ _id: { $in: reportIds } }).populate('linkId');

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const report of reports) {
      try {
        if (action === 'APPROVE') {
          report.status = 'APPROVED';
          report.reviewedBy = req.user.sub || req.user._id;
          report.reviewedAt = new Date();
          report.reviewNotes = reviewNotes;
          await report.save();
        } else if (action === 'REJECT') {
          report.status = 'REJECTED';
          report.reviewedBy = req.user.sub || req.user._id;
          report.reviewedAt = new Date();
          report.reviewNotes = reviewNotes;
          await report.save();
        } else if (action === 'BLOCK_LINKS' && report.linkId) {
          report.linkId.status = 'blocked';
          await report.linkId.save();
          report.status = 'APPROVED';
          report.actionTaken = 'BLOCKED';
          report.reviewedBy = req.user.sub || req.user._id;
          report.reviewedAt = new Date();
          await report.save();
        } else if (action === 'DELETE_LINKS' && report.linkId) {
          await Link.findByIdAndDelete(report.linkId._id);
          report.status = 'APPROVED';
          report.actionTaken = 'DELETED';
          report.reviewedBy = req.user.sub || req.user._id;
          report.reviewedAt = new Date();
          await report.save();
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ reportId: report._id, error: err.message });
      }
    }

    // Create audit log for bulk action
    await AuditLog.create({
      action: 'BULK_MODERATION',
      adminId: req.user.sub || req.user._id,
      adminEmail: req.user.email,
      adminName: req.user.username || req.user.email,
      target: 'flagreport',
      details: {
        action,
        reportCount: reportIds.length,
        successCount: results.success,
        failedCount: results.failed,
        reviewNotes
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ 
      message: `Bulk action completed: ${results.success} succeeded, ${results.failed} failed`,
      results 
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ message: 'Failed to perform bulk action' });
  }
});

module.exports = router;
