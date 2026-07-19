
const mongoose = require('mongoose');
require('dotenv').config();
const Link = require('../models/Link');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deadman_link';

async function assignOwnerToLinks() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all links without an ownerEmail
    const linksWithoutOwner = await Link.find({ 
      $or: [
        { ownerEmail: null },
        { ownerEmail: { $exists: false } }
      ]
    });

    console.log(`\nFound ${linksWithoutOwner.length} links without an owner`);

    if (linksWithoutOwner.length === 0) {
      console.log('No links to update. All links already have an owner.');
      process.exit(0);
    }

    // Prompt user for email
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('\nEnter the email address to assign to these links: ', async (email) => {
      if (!email || !email.includes('@')) {
        console.log('❌ Invalid email address');
        readline.close();
        process.exit(1);
      }

      // Update all links without owner to this email
      const result = await Link.updateMany(
        { 
          $or: [
            { ownerEmail: null },
            { ownerEmail: { $exists: false } }
          ]
        },
        { 
          $set: { ownerEmail: email }
        }
      );

      console.log(`\n✅ Updated ${result.modifiedCount} links`);
      console.log(`   All links now assigned to: ${email}`);

      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignOwnerToLinks();
