// server/models/AdminUser.js
const mongoose = require('mongoose');

const NotificationSettingsSchema = new mongoose.Schema(
  {
    emailOnDestruction: {
      type: Boolean,
      default: true,
    },
    suspiciousActivity: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const DefaultSettingsSchema = new mongoose.Schema(
  {
    collection: { type: String, default: 'General' },
    showPreview: { type: Boolean, default: true },
    maxClicks: { type: Number, default: 0 },
    isOneTime: { type: Boolean, default: false },
  },
  { _id: false }
);

const PrivacySettingsSchema = new mongoose.Schema(
  {
    showCreatorName: { type: Boolean, default: true },
    enableReferrerTracking: { type: Boolean, default: true },

    // NEW: whether this user's links can be suggested to others
    allowLinkSuggestions: { type: Boolean, default: true },
  },
  { _id: false }
);

const SecuritySettingsSchema = new mongoose.Schema(
  {
    notifyNewDevice: { type: Boolean, default: true },
    notifyFailedAttempt: { type: Boolean, default: true },
  },
  { _id: false }
);

const AutoDestructRulesSchema = new mongoose.Schema(
  {
    expireAfterDays: { type: Number, default: null }, // null = no auto-expire
    destroyOnFirstClick: { type: Boolean, default: false },
  },
  { _id: false }
);

const SessionSchema = new mongoose.Schema(
  {
    device: { type: String },
    ip: { type: String },
    lastActive: { type: Date },
  },
  { _id: false }
);

const AdminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    // access control
    role: {
      type: String,
      enum: ['regular', 'premium', 'admin'],
      default: 'regular',
    },
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active',
    },

    lastLoginAt: { type: Date, default: null },

    // NEW: profile & settings
    avatarColor: {
      type: String,
      default: '#10B981', // emerald vibe
    },
    timezone: {
      type: String,
      default: 'UTC',
    },

    notificationSettings: {
      type: NotificationSettingsSchema,
      default: () => ({}),
    },

    defaultSettings: {
      type: DefaultSettingsSchema,
      default: () => ({}),
    },

    privacy: {
      type: PrivacySettingsSchema,
      default: () => ({}),
    },

    securitySettings: {
      type: SecuritySettingsSchema,
      default: () => ({}),
    },

    autoDestructRules: {
      type: AutoDestructRulesSchema,
      default: () => ({}),
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    sessions: {
      type: [SessionSchema],
      default: [],
    },

    // OPTIONAL: password support for future auth
    passwordHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminUser', AdminUserSchema);
