const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  recipientEmail: { type: String, required: true },
  recipientName: { type: String },
  token: { type: String, unique: true, required: true }, // Cryptographically secure token
  status: { type: String, enum: ['pending', 'verified', 'frozen', 'revoked'], default: 'pending' },
  
  // Device binding information
  trustedDevice: {
    fingerprint: { type: String, default: null },
    ip: { type: String },
    userAgent: { type: String },
    registeredAt: { type: Date }
  },
  
  confidenceScore: { type: Number, default: 100 }, // 0 to 100, drops on suspicious activity
  leakReason: { type: String, default: null },

  currentOtp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // Optional expiration
});

// Compound index to ensure a recipient only gets one invitation per link
invitationSchema.index({ linkId: 1, recipientEmail: 1 }, { unique: true });

module.exports = mongoose.model('Invitation', invitationSchema);
