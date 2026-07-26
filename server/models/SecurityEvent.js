const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  invitationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invitation' },
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  eventType: { 
    type: String, 
    enum: ['unauthorized_access', 'device_mismatch', 'impossible_travel', 'brute_force'],
    required: true
  },
  attemptedFingerprint: { type: String },
  ipAddress: { type: String },
  location: { 
    country: String, 
    city: String 
  },
  confidenceOfLeak: { type: Number, min: 0, max: 100 },
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false }
});

securityEventSchema.index({ linkId: 1, timestamp: -1 });
securityEventSchema.index({ invitationId: 1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
