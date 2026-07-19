// server/models/AnalyticsEvent.js
const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
    slug: { type: String, required: true },

    ip: { type: String },
    userAgent: { type: String },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'bot', 'unknown'],
      default: 'unknown',
    },
    country: { type: String, default: 'Unknown' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
