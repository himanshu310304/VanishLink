// server/routes/linkRoutes.js
const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const AdminUser = require('../models/AdminUser');
const { scoreSimilarity } = require('../utils/linkSimilarity');

/**
 * GET /api/links/similar
 *
 * Query:
 *   url / targetUrl / link   -> destination URL to compare against
 *   title?                   -> optional title from form
 *   metaDescription?         -> optional description from form
 *   ownerEmail?              -> current user email (so we don't show own links)
 */
router.get('/similar', async (req, res) => {
  try {
    let { url, targetUrl, link, title, metaDescription, ownerEmail } =
      req.query;

    // accept multiple possible param names and don't hard-error
    const finalUrl = (url || targetUrl || link || '').trim();

    // if nothing valid, just say "no suggestions" instead of 400
    if (!finalUrl) {
      return res.json([]);
    }

    const targetLink = {
      targetUrl: finalUrl,
      title: title || '',
      metaDescription: metaDescription || '',
    };

    // only consider public, non-removed links as candidates
    const candidates = await Link.find({
  moderationStatus: { $ne: 'removed' },
  $or: [
    { visibility: 'public' },              // new, explicitly public
    { visibility: { $exists: false } },     // old docs without field → treat as public
  ],
})
  .limit(500)
  .lean();

    if (!candidates.length) {
      return res.json([]);
    }

    // build map: ownerEmail -> allowLinkSuggestions
    const ownerEmails = [
      ...new Set(candidates.map((l) => l.ownerEmail).filter(Boolean)),
    ];

    const users = ownerEmails.length
      ? await AdminUser.find({ email: { $in: ownerEmails } }).lean()
      : [];

    const allowMap = new Map();
    for (const u of users) {
      const privacy = u.privacy || {};
      const allow =
        typeof privacy.allowLinkSuggestions === 'boolean'
          ? privacy.allowLinkSuggestions
          : true; // default: allowed
      allowMap.set(u.email, allow);
    }

    const filtered = candidates.filter((linkDoc) => {
      // don't suggest your own links back to you
      if (ownerEmail && linkDoc.ownerEmail === ownerEmail) return false;

      // system / anonymous links are allowed
      if (!linkDoc.ownerEmail) return true;

      const allow = allowMap.get(linkDoc.ownerEmail);
      return allow !== false;
    });

    const scored = filtered
      .map((linkDoc) => {
        const { score, reasons } = scoreSimilarity(targetLink, linkDoc);
        return { linkDoc, score, reasons };
      })
      .filter((item) => item.score >= 3) // ignore very weak matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return res.json(
      scored.map((s) => ({
        id: s.linkDoc._id,
        slug: s.linkDoc.slug,
        targetUrl: s.linkDoc.targetUrl,
        title: s.linkDoc.title,
        metaDescription: s.linkDoc.metaDescription,
        visibility: s.linkDoc.visibility,
        score: s.score,
        reasons: s.reasons,
      }))
    );
  } catch (err) {
    console.error('Error in GET /api/links/similar:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
