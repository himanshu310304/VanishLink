// server/routes/redirectRoutes.js
const express = require('express');
const router = express.Router();
const Link = require('../models/Link');

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const link = await Link.findOne({ slug });

    if (!link) {
      return res.status(404).send('Link not found');
    }

    // scheduled activation
    if (link.scheduleStart && link.scheduleStart > new Date()) {
      return res.status(404).send('Link not active yet');
    }

    // expiry
    if (link.expiresAt && link.expiresAt < new Date()) {
      return res.status(410).send('This link has expired');
    }

    // max clicks
    if (link.maxClicks != null && link.clickCount >= link.maxClicks) {
      return res.status(410).send('This link has been destroyed');
    }

    // bump click count
    link.clickCount += 1;
    await link.save();

    // later: if showPreview is true, you could return JSON instead of redirect
    return res.redirect(link.targetUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

module.exports = router;
