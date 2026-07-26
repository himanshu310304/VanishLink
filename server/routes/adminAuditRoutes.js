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
      .sort({ timestamp: -1 })
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

module.exports = router;
