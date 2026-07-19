// server/routes/adminLinkRoutes.js
const express = require('express');
const Link = require('../models/Link');
const { auditLogger } = require('../middleware/auditLogger');
const { logAuditEvent } = require('../scripts/auditLogger');
const { basicUrlSafetyCheck } = require('../scripts/urlSafety'); // ⬅️ add this

const router = express.Router();

/**
 * GET /api/admin/links
 * Query params:
 *  - search
 *  - status: active | expired | blocked
 *  - moderation: flagged | removed
 *  - risk: flagged | high
 *  - page, limit
 */
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      status,
      moderation,
      risk,        // ⬅ NEW
      page = 1,
      limit = 20,
    } = req.query;

    const andConditions = [];

    // text search
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      andConditions.push({
        $or: [
          { slug: regex },
          { title: regex },
          { targetUrl: regex },
        ],
      });
    }

    // status filter
    if (status && ['active', 'expired', 'blocked'].includes(status)) {
      andConditions.push({ status });
    }

    // moderation filter
    if (moderation === 'flagged') {
      andConditions.push({ moderationStatus: 'flagged' });
    } else if (moderation === 'removed') {
      andConditions.push({ moderationStatus: 'removed' });
    }

    // ⭐ NEW: risk filter
    if (risk === 'flagged') {
      // flagged by AI or by admin
      andConditions.push({
        $or: [
          { isFlagged: true },
          { moderationStatus: 'flagged' },
        ],
      });

    } else if (risk === 'high') {
      // high-risk based on AI safety scanner
      andConditions.push({
        safetyVerdict: 'high',
      });
    }

    const q = andConditions.length > 0 ? { $and: andConditions } : {};

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [items, total] = await Promise.all([
      Link.find(q)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Link.countDocuments(q),
    ]);

    const pages = Math.ceil(total / limitNum) || 1;

    res.json({
      items,
      total,
      page: pageNum,
      pages,
      links: items,
      totalLinks: total,
      totalPages: pages,
    });
  } catch (err) {
    console.error('Error in GET /api/admin/links:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/links/:id
 */
router.patch('/:id', 
  auditLogger('BLOCK_LINK', (req, data) => `slug: ${data.slug || req.params.id}`),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { status, maxClicks } = req.body;

    const update = {};
    if (status && ['active', 'expired', 'blocked'].includes(status)) {
      update.status = status;
    }
    if (typeof maxClicks === 'number') {
      update.maxClicks = maxClicks;
    }

    const updated = await Link.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Link not found' });

    await logAuditEvent({
      action: 'UPDATE_LINK',
      target: `slug: ${updated.slug} (id: ${updated._id})`,
      adminName: 'Admin Console',
      ipAddress: req.ip,
      metadata: {
        status: updated.status,
        maxClicks: updated.maxClicks,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Error in PATCH /api/admin/links/:id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/links/:id/flag
 */
router.post('/:id/flag', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body || {};

    const link = await Link.findById(id);
    if (!link) return res.status(404).json({ message: 'Link not found' });

    link.isFlagged = true;
    link.flagReason = reason || link.flagReason || 'Manually flagged by admin';
    link.flaggedAt = link.flaggedAt || new Date();
    link.moderationStatus = 'flagged';
    link.moderatedBy = 'Admin Console';
    link.moderatedAt = new Date();
    if (notes) link.moderationNotes = notes;

    await link.save();

    await logAuditEvent({
      action: 'FLAG_LINK',
      target: `slug: ${link.slug} (id: ${link._id})`,
      adminName: 'Admin Console',
      ipAddress: req.ip,
      metadata: { reason: link.flagReason },
    });

    res.json(link);
  } catch (err) {
    console.error('Error in POST /api/admin/links/:id/flag:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/links/bulk-moderate
 */
router.post('/bulk-moderate', async (req, res) => {
  try {
    let { ids, action, reason, notes } = req.body || {};
    ids = Array.isArray(ids) ? ids : [];

    if (!ids.length)
      return res.status(400).json({ message: 'ids array cannot be empty' });

    if (!['flag', 'block'].includes(action))
      return res.status(400).json({ message: 'action must be "flag" or "block"' });

    const links = await Link.find({ _id: { $in: ids } });

    const now = new Date();
    let updatedCount = 0;

    for (const link of links) {
      if (action === 'flag') {
        link.isFlagged = true;
        link.flagReason = reason || link.flagReason || 'Bulk flagged by admin';
        link.flaggedAt = link.flaggedAt || now;
        link.moderationStatus = 'flagged';
      } else if (action === 'block') {
        link.status = 'blocked';
        link.isFlagged = true;
        link.moderationStatus = 'removed';
      }

      link.moderatedBy = 'Admin Console';
      link.moderatedAt = now;
      if (notes) link.moderationNotes = notes;

      await link.save();
      updatedCount++;
    }

    await logAuditEvent({
      action: action === 'flag' ? 'BULK_FLAG_LINKS' : 'BULK_REMOVE_LINKS',
      target: `ids: ${ids.join(',')}`,
      adminName: 'Admin Console',
      ipAddress: req.ip,
      metadata: { action, updatedCount },
    });

    res.json({ success: true, updatedCount });
  } catch (err) {
    console.error('Error in POST /api/admin/links/bulk-moderate:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/links/:id
 */
router.delete('/:id',
  auditLogger('DELETE_LINK', (req) => `link ID: ${req.params.id}`),
  async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Link.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Link not found' });

    await logAuditEvent({
      action: 'DELETE_LINK',
      target: `slug: ${deleted.slug} (id: ${deleted._id})`,
      adminName: 'Admin Console',
      ipAddress: req.ip,
      metadata: {
        title: deleted.title,
        targetUrl: deleted.targetUrl,
        ownerEmail: deleted.ownerEmail || null,
        status: deleted.status,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/admin/links/:id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/links/rescan-safety
 * Body: { onlyMissing?: boolean }
 * - onlyMissing = true  → only links that don't have safetyScore yet
 * - onlyMissing = false → rescan everything
 */
router.post('/rescan-safety', async (req, res) => {
  try {
    const { onlyMissing = true } = req.body || {};
    const query = onlyMissing
      ? { $or: [{ safetyScore: null }, { safetyVerdict: null }] }
      : {};

    const links = await Link.find(query);
    const now = new Date();
    let updatedCount = 0;

    for (const link of links) {
      const safety = basicUrlSafetyCheck(link.targetUrl);

      link.safetyScore = safety.score;
      link.safetyVerdict = safety.verdict;
      link.isFlagged = safety.flagRecommended;
      if (safety.flagRecommended) {
        link.flagReason = link.flagReason || 'auto_flag_safety_scanner_rescan';
        link.flaggedAt = link.flaggedAt || now;
        link.moderationStatus = 'flagged';
      }

      await link.save();
      updatedCount += 1;
    }

    await logAuditEvent({
      action: 'RESCAN_LINK_SAFETY',
      target: `rescan_safety onlyMissing=${onlyMissing}`,
      adminName: 'Admin Console',
      ipAddress: req.ip,
      metadata: { updatedCount, onlyMissing },
    });

    res.json({ success: true, updatedCount });
  } catch (err) {
    console.error('Error in POST /api/admin/links/rescan-safety:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
