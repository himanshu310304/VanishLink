// server/scripts/seedAdminUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deadman_link';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Mongo connected for seeding');

    // upsert a few sample users
    const users = [
      {
        name: 'Agent 007',
        email: 'bond@mi6.gov',
        role: 'premium',
        status: 'active',
      },
      {
        name: 'Spam Bot',
        email: 'bot@spam.net',
        role: 'regular',
        status: 'banned',
      },
      {
        name: 'Admin One',
        email: 'root@sys.gov',
        role: 'admin',
        status: 'active',
      },
    ];

    for (const u of users) {
      const updated = await AdminUser.findOneAndUpdate(
        { email: u.email },
        { $set: u, lastLoginAt: new Date() },
        { upsert: true, new: true }
      );
      console.log('Upserted:', updated.email);
    }

    console.log('✅ Admin users seeded.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

run();
