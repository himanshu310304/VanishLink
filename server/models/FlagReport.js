const mongoose = require('mongoose');

const flagReportSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: true,
    index: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous reports
  },
  reporterEmail: {
    type: String,
    required: false
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'SPAM',
      'MALWARE',
      'PHISHING',
      'INAPPROPRIATE_CONTENT',
      'ILLEGAL_CONTENT',
      'MISLEADING',
      'COPYRIGHT_VIOLATION',
      'OTHER'
    ]
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  reviewedAt: {
    type: Date,
    required: false
  },
  reviewNotes: {
    type: String,
    maxlength: 500
  },
  actionTaken: {
    type: String,
    enum: ['NONE', 'BLOCKED', 'DELETED', 'WARNING_SENT'],
    default: 'NONE'
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
flagReportSchema.index({ status: 1, createdAt: -1 });
flagReportSchema.index({ linkId: 1, status: 1 });

module.exports = mongoose.model('FlagReport', flagReportSchema);
