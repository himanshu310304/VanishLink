// server/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'DELETE_LINK',
      'BLOCK_LINK',
      'UNBLOCK_LINK',
      'CREATE_LINK',
      'BAN_USER',
      'UNBAN_USER',
      'CHANGE_USER_ROLE',
      'UPDATE_USER',
      'UPDATE_SETTINGS',
      'BLOCK_IP',
      'UNBLOCK_IP',
      'BULK_DELETE',
      'BULK_BLOCK',
      'LOGIN_ADMIN',
      'LOGIN_FAILED',
      'LOGOUT_ADMIN',
      'APPROVE_REPORT',
      'REJECT_REPORT',
      'BULK_MODERATION',
    ],
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adminEmail: {
    type: String,
    required: true,
  },
  adminName: {
    type: String,
    required: true,
  },
  target: {
    type: String, // Description of what was affected
    required: true,
  },
  targetId: {
    type: String, // ID of the affected resource
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Additional context
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
