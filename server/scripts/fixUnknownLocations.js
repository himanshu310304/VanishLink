// Script to update all "Unknown" country records with actual geolocation data
const mongoose = require('mongoose');
require('dotenv').config();

const AnalyticsEvent = require('../models/AnalyticsEvent');

async function fixUnknownLocations() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all events with Unknown country
    const unknownEvents = await AnalyticsEvent.find({ 
      country: 'Unknown'
    });

    console.log(`📊 Found ${unknownEvents.length} events with Unknown location`);

    let updated = 0;
    let setToLocal = 0;
    let failed = 0;

    for (const event of unknownEvents) {
      const ip = event.ip;
      
      console.log(`🔍 Processing event ${event._id} with IP: ${ip}`);

      // If no IP, set to Unknown-NoIP
      if (!ip || ip === 'undefined' || ip === 'null') {
        event.country = 'Unknown-NoIP';
        await event.save();
        failed++;
        console.log(`⚠️  No IP available, marked as Unknown-NoIP`);
        continue;
      }

      // Check for localhost/private IPs (including IPv6 format)
      const cleanIp = ip.replace('::ffff:', '');
      if (ip === '::1' || cleanIp === '127.0.0.1' || 
          cleanIp.startsWith('192.168.') || 
          cleanIp.startsWith('10.') || 
          cleanIp.startsWith('172.16.') || 
          cleanIp.startsWith('172.17.') || 
          cleanIp.startsWith('172.18.') ||
          cleanIp.startsWith('172.19.') ||
          cleanIp.startsWith('172.2') ||
          cleanIp.startsWith('172.30.') ||
          cleanIp.startsWith('172.31.')) {
        event.country = 'Local';
        await event.save();
        setToLocal++;
        console.log(`🏠 Local/Private IP detected -> Local`);
        continue;
      }

      try {
        console.log(`🌍 Looking up IP: ${ip}`);
        const response = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,message`);
        const data = await response.json();
        
        console.log(`📡 API Response:`, data);

        if (data.status === 'success' && data.country) {
          event.country = data.country;
          await event.save();
          updated++;
          console.log(`✅ Updated ${ip} -> ${data.country}`);
        } else if (data.message === 'private range' || data.message === 'reserved range') {
          // API detected it's a private IP
          event.country = 'Local';
          await event.save();
          setToLocal++;
          console.log(`🏠 Private range detected by API -> Local`);
        } else {
          console.log(`❌ Failed for ${ip}: ${data.message || 'No country in response'}`);
          // Keep as Unknown if lookup fails
          failed++;
        }

        // Rate limit: wait 200ms between requests (ip-api.com free tier: 45 req/min)
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`❌ Error looking up ${ip}:`, err.message);
        failed++;
      }
    }

    console.log(`\n📊 Final Results:`);
    console.log(`✅ Updated with country: ${updated}`);
    console.log(`🏠 Set to Local: ${setToLocal}`);
    console.log(`❌ Failed/No Data: ${failed}`);
    console.log(`✨ Total processed: ${unknownEvents.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUnknownLocations();
