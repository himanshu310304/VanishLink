// server/models/SystemSettings.js
const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // There should only be one document - singleton pattern
  _id: {
    type: String,
    default: 'system_settings',
  },
  
  // Global Defaults
  maxLinkTTL: {
    type: Number,
    default: 30, // days
    min: 1,
    max: 365,
  },
  slugRegex: {
    type: String,
    default: '^[a-zA-Z0-9-_]+$',
  },
  allowAnonymousLinks: {
    type: Boolean,
    default: true,
  },
  requireEmailVerification: {
    type: Boolean,
    default: true,
  },
  
  // Rate Limiting
  rateLimitGeneral: {
    windowMs: { type: Number, default: 15 * 60 * 1000 }, // 15 min
    max: { type: Number, default: 100 },
  },
  rateLimitAuth: {
    windowMs: { type: Number, default: 15 * 60 * 1000 },
    max: { type: Number, default: 5 },
  },
  rateLimitLinkCreation: {
    windowMs: { type: Number, default: 60 * 60 * 1000 }, // 1 hour
    max: { type: Number, default: 20 },
  },
  
  // Security
  ipBlockingEnabled: {
    type: Boolean,
    default: true,
  },
  suspiciousThreshold: {
    type: Number,
    default: 50, // requests per minute
  },
  blockDuration: {
    type: Number,
    default: 60, // minutes
  },
  
  // Moderation
  bannedKeywords: {
    type: [String],
    default: [],
  },
  autoFlagBannedKeywords: {
    type: Boolean,
    default: true,
  },
  
  // Features
  enableWatchParty: {
    type: Boolean,
    default: true,
  },
  enableAnalytics: {
    type: Boolean,
    default: true,
  },
  enableQRCodes: {
    type: Boolean,
    default: true,
  },
  
  // Content Moderation
  autoModeration: {
    type: Boolean,
    default: false,
  },
  bannedKeywords: {
    type: [String],
    default: [],
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Update timestamp on save
systemSettingsSchema.pre('save', function() {
  this.lastUpdated = new Date();
});

// Static method to get settings (creates default if doesn't exist)
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('system_settings');
  if (!settings) {
    try {
      settings = await this.create({ _id: 'system_settings' });
    } catch (err) {
      // If duplicate key error (race condition), fetch again
      if (err.code === 11000) {
        settings = await this.findById('system_settings');
      } else {
        throw err;
      }
    }
  }
  return settings;
};

// Static method to update settings
systemSettingsSchema.statics.updateSettings = async function(updates, adminId) {
  const settings = await this.getSettings();
  Object.assign(settings, updates);
  settings.updatedBy = adminId;
  await settings.save();
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
