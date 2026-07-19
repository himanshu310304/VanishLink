// Migration script to assign existing links to a user
// Usage: node scripts/migrateLinks.js <userEmail>

require('dotenv').config();
const mongoose = require('mongoose');
const Link = require('../models/Link');
const User = require('../models/User');

const migrateLinks = async (userEmail) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    // Find all links without createdBy
    const orphanedLinks = await Link.find({ 
      $or: [
        { createdBy: null },
        { createdBy: { $exists: false } }
      ]
    });

    console.log(`Found ${orphanedLinks.length} links without owner`);

    if (orphanedLinks.length === 0) {
      console.log('No links to migrate');
      process.exit(0);
    }

    // Ask for confirmation
    console.log('\nThese links will be assigned to:', user.email);
    console.log('Links:');
    orphanedLinks.forEach(link => {
      console.log(`  - ${link.slug}: ${link.title || link.targetUrl}`);
    });

    // Update all orphaned links
    const result = await Link.updateMany(
      { 
        $or: [
          { createdBy: null },
          { createdBy: { $exists: false } }
        ]
      },
      { 
        $set: { 
          createdBy: user._id,
          ownerEmail: user.email
        }
      }
    );

    console.log(`\n✅ Successfully migrated ${result.modifiedCount} links to ${user.email}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

// Get email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: node scripts/migrateLinks.js <userEmail>');
  console.error('Example: node scripts/migrateLinks.js user@example.com');
  process.exit(1);
}

migrateLinks(userEmail);
