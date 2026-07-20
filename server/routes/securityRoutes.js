// server/routes/securityRoutes.js
const express = require('express');
// 🔁 use the same heuristic scanner used in index.js
const { basicUrlSafetyCheck } = require('../scripts/urlSafety');

const router = express.Router();

/**
 * POST /api/security/scan-url
 * Body can be: { url } OR { targetUrl } OR { link }
 * Returns: { score, verdict, reasons, flagRecommended, hostname }
 */
router.post('/scan-url', (req, res) => {
  try {
    let { url, targetUrl, link } = req.body || {};

    console.log('[/security/scan-url] raw body:', req.body);

    const finalUrl = (url || targetUrl || link || '').trim();

    if (!finalUrl || typeof finalUrl !== 'string') {
      console.log('[/security/scan-url] missing url in body');
      return res
        .status(400)
        .json({ message: 'security-scan: url is required' }); // 👈 UNIQUE MESSAGE
    }

    const result = basicUrlSafetyCheck(finalUrl);
    return res.json(result);
  } catch (err) {
    console.error('URL safety scan failed:', err);
    return res.status(500).json({ message: 'Failed to scan URL' });
  }
});

module.exports = router;
