// server/models/Link.js
const mongoose = require('mongoose');

// ---- Conditional redirect sub-schemas ----

const TimeWindowSchema = new mongoose.Schema(
  {
    // 0–23 (24h)
    startHour: { type: Number, min: 0, max: 23, required: true },
    endHour: { type: Number, min: 0, max: 23, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const ClickRangeSchema = new mongoose.Schema(
  {
    minClicks: { type: Number, default: 0 },
    maxClicks: { type: Number, default: null }, // null = no upper bound
    url: { type: String, required: true },
  },
  { _id: false }
);

const ConditionalRedirectSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },

    // device-based overrides
    deviceRules: {
      mobileUrl: { type: String, default: null },
      desktopUrl: { type: String, default: null },
      tabletUrl: { type: String, default: null },
      botUrl: { type: String, default: null },
    },

    // list of time windows (server local time)
    timeOfDayRules: {
      type: [TimeWindowSchema],
      default: [],
    },

    // weekday vs weekend
    dayTypeRules: {
      weekdayUrl: { type: String, default: null },
      weekendUrl: { type: String, default: null },
    },

    // click-count-based routing
    clickRules: {
      type: [ClickRangeSchema],
      default: [],
    },
  },
  { _id: false }
);

// ---- Webhook config ----
const WebhookConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    url: { type: String, default: null },
    secret: { type: String, default: null }, // sent as header for verification

    triggers: {
      onFirstClick: { type: Boolean, default: false },
      onExpiry: { type: Boolean, default: false },
      onOneTimeComplete: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const linkSchema = new mongoose.Schema(
  {
    title: { type: String },
    // optional meta / description text – useful for similarity
    metaDescription: { type: String, default: null },

    slug: { type: String, required: true, unique: true },
    targetUrl: { type: String, required: true },

    // NEW: link visibility
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },

    password: { type: String, default: null },
    isOneTime: { type: Boolean, default: false },
    maxClicks: { type: Number, default: 0 }, // 0 = unlimited
    expiresAt: { type: Date, default: null },
    showPreview: { type: Boolean, default: false },
    collection: { type: String, default: 'General' },
    scheduleStart: { type: Date, default: null },
     visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },

    clicks: { type: Number, default: 0 },
    status: { type: String, default: 'active' },

    // Creator info
    creatorName: { type: String, default: 'Anonymous' },
    creatorAvatar: { type: String, default: null }, // URL to creator's avatar

    // Who actually owns this link (for per-user dashboards)
    ownerEmail: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Favorites / Highlights
    isFavorite: { type: Boolean, default: false },

    // 🔎 Moderation fields
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, default: null },
    flaggedAt: { type: Date, default: null },

    // clean = normal, flagged = under review, removed = policy-removal
    moderationStatus: {
      type: String,
      enum: ['clean', 'flagged', 'removed'],
      default: 'clean',
    },
    moderatedBy: { type: String, default: null },
    moderatedAt: { type: Date, default: null },
    moderationNotes: { type: String, default: null },

    safetyScore: { type: Number, default: null },
    safetyVerdict: {
      type: String,
      enum: [null, 'low', 'medium', 'high'],
      default: null,
    },

    // 🧠 Dynamic conditional redirect config
    conditionalRedirect: {
      type: ConditionalRedirectSchema,
      default: () => ({}),
    },

    // 🌐 Webhook configuration per link
    webhookConfig: {
      type: WebhookConfigSchema,
      default: () => ({
        enabled: false,
        triggers: {},
      }),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Link', linkSchema);
