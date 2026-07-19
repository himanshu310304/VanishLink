// server/middleware/auditLogger.js
const AuditLog = require('../models/AuditLog');

/**
 * Middleware to log admin actions
 * Usage: router.post('/endpoint', auditLogger('ACTION_NAME', 'description'), handler)
 */
const auditLogger = (action, getTarget) => {
  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      // Only log if response is successful (2xx status codes) and user is authenticated
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const admin = req.user; // JWT payload: { sub, email, role }
        
          // Validate admin has required fields (JWT uses 'sub' for user ID)
          const adminId = admin._id || admin.sub;
          if (!adminId || !admin.email) {
            console.error('Audit log skipped: req.user missing ID or email', {
              hasId: !!adminId,
              hasEmail: !!admin.email,
              user: admin
            });
            return originalJson(data);
          }
          
          const target = typeof getTarget === 'function' ? getTarget(req, data) : getTarget;
          
          // Skip if target is undefined/null
          if (!target) {
            console.log('Audit log skipped: target is null/undefined');
            return originalJson(data);
          }
          
          await AuditLog.create({
            action,
            adminId: adminId,
            adminEmail: admin.email,
            adminName: admin.name || admin.email,
            target: String(target),
            targetId: req.params.id || data?._id?.toString(),
            details: {
              method: req.method,
              path: req.path,
              body: req.body,
              query: req.query,
            },
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
          });
          
          console.log(`📝 Audit log created: ${action} by ${admin.email}`);
        } catch (err) {
          console.error('Failed to create audit log:', err.message);
          console.error('req.user:', req.user);
          // Don't fail the request if audit logging fails
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Manually create an audit log entry
 */
const createAuditLog = async (action, admin, target, details = {}) => {
  try {
    // Support both full user objects and JWT payloads
    const adminId = admin._id || admin.sub;
    
    await AuditLog.create({
      action,
      adminId: adminId,
      adminEmail: admin.email,
      adminName: admin.name || admin.email,
      target,
      targetId: details.targetId,
      details,
      ip: details.ip || 'system',
      userAgent: details.userAgent || 'system',
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
};

module.exports = {
  auditLogger,
  createAuditLog,
};
