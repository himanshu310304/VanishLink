// Script to create an admin user or promote existing user to admin
// Usage: node scripts/createAdmin.js <email> [name] [password]

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const createAdmin = async (email, name, password) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // Promote existing user to admin
      console.log(`User ${email} already exists. Promoting to admin...`);
      user.role = 'admin';
      await user.save();
      console.log(`✅ Successfully promoted ${user.name} (${user.email}) to admin`);
    } else {
      // Create new admin user
      if (!name || !password) {
        console.error('❌ For new users, you must provide name and password');
        console.error('Usage: node scripts/createAdmin.js <email> <name> <password>');
        process.exit(1);
      }

      user = await User.create({
        email,
        name,
        password, // Will be hashed by pre-save hook
        role: 'admin',
        authProvider: 'local'
      });

      console.log(`✅ Successfully created admin user: ${user.name} (${user.email})`);
    }

    console.log('\nYou can now login with:');
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create/promote admin:', err.message);
    process.exit(1);
  }
};

// Get arguments from command line
const email = process.argv[2];
const name = process.argv[3];
const password = process.argv[4];

if (!email) {
  console.error('Usage:');
  console.error('  Promote existing user: node scripts/createAdmin.js <email>');
  console.error('  Create new admin:      node scripts/createAdmin.js <email> <name> <password>');
  console.error('\nExamples:');
  console.error('  node scripts/createAdmin.js admin@example.com');
  console.error('  node scripts/createAdmin.js admin@example.com "Admin User" "password123"');
  process.exit(1);
}

createAdmin(email, name, password);
