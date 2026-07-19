// server/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const AnalyticsEvent = require('../models/AnalyticsEvent');

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Get user's email from authenticated request
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get only user's links + analytics events for those links
    const links = await Link.find({ ownerEmail: userEmail });
    
    // Get link IDs to filter analytics events
    const linkIds = links.map(link => link._id);
    
    const events = await AnalyticsEvent.find({ 
      link: { $in: linkIds },
      createdAt: { $gte: sevenDaysAgo } 
    });

    // ----- totals from links -----
    let totalClicks = 0;
    let activeLinks = 0;

    links.forEach((link) => {
      const clicks = link.clicks ?? link.clickCount ?? 0;
      totalClicks += clicks;

      const isExpired =
        link.status === 'expired' ||
        (link.expiresAt && now > link.expiresAt);

      if (!isExpired) {
        activeLinks += 1;
      }
    });

    // ----- device + geo info from events -----
    const totalEvents = events.length;
    let mobileCount = 0;
    const countryCounts = {};
    const dayBuckets = {};

    events.forEach((ev) => {
      if (ev.deviceType === 'mobile') mobileCount++;

      const country = ev.country || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;

      const dayKey = ev.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      dayBuckets[dayKey] = (dayBuckets[dayKey] || 0) + 1;
    });

    const mobile =
      totalEvents > 0 ? Math.round((mobileCount / totalEvents) * 100) : 0;

    let topLocation = 'Unknown';
    let topCount = 0;
    Object.entries(countryCounts).forEach(([country, count]) => {
      if (count > topCount) {
        topCount = count;
        topLocation = country;
      }
    });

    const timeline = Object.keys(dayBuckets)
      .sort()
      .map((date) => ({
        date,
        clicks: dayBuckets[date],
      }));

    const geo = Object.entries(countryCounts).map(([country, clicks]) => ({
      country,
      clicks,
    }));

    res.json({
      total: totalClicks,
      activeLinks,
      mobile,
      topLocation,
      timeline,
      geo,
    });
  } catch (err) {
    console.error('Error in GET /api/analytics:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
