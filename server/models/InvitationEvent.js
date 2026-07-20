const mongoose = require('mongoose');

const invitationEventSchema = new mongoose.Schema({
  invitationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invitation', required: true },
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  eventType: { 
    type: String, 
    enum: ['access_attempt', 'verified', 'leak_detected', 'frozen', 'revoked'],
    required: true
  },
  success: { type: Boolean, required: true },
  failureReason: { type: String }, // Populated if success is false
  
  // Request Context
  ip: { type: String },
  userAgent: { type: String },
  country: { type: String },
  deviceFingerprint: { type: String },
  
  timestamp: { type: Date, default: Date.now }
});

// Index for querying events for a specific invitation or link
invitationEventSchema.index({ invitationId: 1, timestamp: -1 });
invitationEventSchema.index({ linkId: 1, timestamp: -1 });

module.exports = mongoose.model('InvitationEvent', invitationEventSchema);
