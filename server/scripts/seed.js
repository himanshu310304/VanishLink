const mongoose = require('mongoose');
require('dotenv').config();
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Link = require('../models/Link');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const link = await Link.findOne({});
    if (!link) {
      console.log('No links found to associate clicks with.');
      process.exit(1);
    }

    const now = new Date();
    const events = [];
    
    // Seed clicks for the last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      
      const numClicks = Math.floor(Math.random() * 50) + 10;
      for (let j = 0; j < numClicks; j++) {
        events.push({
          link: link._id,
          slug: link.slug,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: j % 3 === 0 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceType: j % 3 === 0 ? 'mobile' : 'desktop',
          country: ['US', 'UK', 'CA', 'IN', 'Unknown'][Math.floor(Math.random() * 5)],
          createdAt: new Date(d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60)))
        });
      }
    }

    await AnalyticsEvent.insertMany(events);
    
    link.clicks = (link.clicks || 0) + events.length;
    await link.save();

    console.log(`Successfully seeded ${events.length} clicks!`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
