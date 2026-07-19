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

async function logAuditEvent({
  action,
  target,
  adminName = 'System',
  adminEmail = null,
  ipAddress = null,
  metadata = {},
}) {
  try {
    const normalizedIp = normalizeIp(ipAddress);

    await AuditLog.create({
      action,
      target,
      adminName,
      adminEmail,
      ipAddress: normalizedIp,
      metadata,
    });
  } catch (err) {
    console.error('Failed to create audit log:', err.message);
  }
}

module.exports = { logAuditEvent };
