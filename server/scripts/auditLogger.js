// server/scripts/auditLogger.js
const AuditLog = require('../models/AuditLog');

function normalizeIp(ip) {
  if (!ip) return null;

  let value = Array.isArray(ip) ? ip[0] : String(ip);

  // If coming as "ip1, ip2, ..." from proxies -> take first
  value = value.split(',')[0].trim();

  // Strip IPv6-mapped IPv4 prefix
  if (value.startsWith('::ffff:')) {
    value = value.slice('::ffff:'.length);
  }

  // Just in case it's "::1" (localhost IPv6)
  if (value === '::1') {
    value = '127.0.0.1';
  }

  return value;
}

const mongoose = require('mongoose');

// Sentinel ObjectId used for system-generated audit entries (no real admin user)
const SYSTEM_ADMIN_ID = new mongoose.Types.ObjectId('000000000000000000000000');

async function logAuditEvent({
  action,
  target,
  adminName = 'System',
  adminEmail = 'system@vanishlink.app',
  adminId = null,
  ipAddress = null,
  metadata = {},
}) {
  try {
    const normalizedIp = normalizeIp(ipAddress);

    await AuditLog.create({
      action,
      target,
      adminId: adminId || SYSTEM_ADMIN_ID,
      adminName,
      adminEmail: adminEmail || 'system@vanishlink.app',
      ip: normalizedIp || 'system',
      details: metadata,
    });
  } catch (err) {
    console.error('Failed to create audit log:', err.message);
  }
}

module.exports = { logAuditEvent };
