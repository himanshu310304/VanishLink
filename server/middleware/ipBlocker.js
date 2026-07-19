// server/middleware/ipBlocker.js
const SystemSettings = require('../models/SystemSettings');

const blockedIPs = new Set();
const suspiciousIPs = new Map(); // IP -> { count, lastSeen }

// Default Configuration (fallback if DB not available)
let SUSPICIOUS_THRESHOLD = 500; // requests per minute
let BLOCK_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const TRACKING_WINDOW = 60 * 1000; // 1 minute

// Load settings from database
const loadSettings = async () => {
  try {
    const settings = await SystemSettings.getSettings();
    if (settings) {
      SUSPICIOUS_THRESHOLD = settings.suspiciousThreshold || 500;
      BLOCK_DURATION = (settings.blockDuration || 10) * 60 * 1000; // Convert minutes to ms
      console.log(`🔧 IP Blocker settings loaded: Threshold=${SUSPICIOUS_THRESHOLD}, Duration=${settings.blockDuration}min`);
    }
  } catch (err) {
    console.error('Failed to load IP blocker settings, using defaults:', err.message);
  }
};

// Export reload function for immediate updates
if (!global.reloadSettingsFunctions) {
  global.reloadSettingsFunctions = [];
}
global.reloadSettingsFunctions.push(loadSettings);

// Reload settings every 5 minutes (backup)
setInterval(loadSettings, 5 * 60 * 1000);

// Load settings on startup (after MongoDB connects)
setTimeout(loadSettings, 2000);

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of suspiciousIPs.entries()) {
    if (now - data.lastSeen > TRACKING_WINDOW) {
      suspiciousIPs.delete(ip);
    }
  }
}, TRACKING_WINDOW);

/**
 * Middleware to block known malicious IPs
 */
const ipBlocker = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Whitelist localhost for development to prevent locking out the admin
  if (
    clientIP === '127.0.0.1' || 
    clientIP === '::1' || 
    clientIP === '::ffff:127.0.0.1'
  ) {
    return next();
  }

  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({ 
      message: 'Access denied. Your IP has been blocked due to suspicious activity.',
      blocked: true 
    });
  }
  
  // Track request frequency
  const now = Date.now();
  if (suspiciousIPs.has(clientIP)) {
    const data = suspiciousIPs.get(clientIP);
    
    // Reset count if outside tracking window
    if (now - data.lastSeen > TRACKING_WINDOW) {
      data.count = 1;
      data.lastSeen = now;
    } else {
      data.count++;
      data.lastSeen = now;
      
      // Block if threshold exceeded
      if (data.count > SUSPICIOUS_THRESHOLD) {
        blockedIPs.add(clientIP);
        suspiciousIPs.delete(clientIP);
        console.warn(`🚫 IP blocked for suspicious activity: ${clientIP}`);
        
        // Auto-unblock after duration
        setTimeout(() => {
          blockedIPs.delete(clientIP);
          console.log(`✅ IP unblocked: ${clientIP}`);
        }, BLOCK_DURATION);
        
        return res.status(403).json({ 
          message: 'Too many requests. Your IP has been temporarily blocked.',
          blocked: true 
        });
      }
    }
  } else {
    suspiciousIPs.set(clientIP, { count: 1, lastSeen: now });
  }
  
  next();
};

/**
 * Manually block an IP address
 */
const blockIP = (ip) => {
  blockedIPs.add(ip);
  suspiciousIPs.delete(ip);
  console.warn(`🚫 IP manually blocked: ${ip}`);
};

/**
 * Manually unblock an IP address
 */
const unblockIP = (ip) => {
  blockedIPs.delete(ip);
  console.log(`✅ IP manually unblocked: ${ip}`);
};

/**
 * Get list of currently blocked IPs
 */
const getBlockedIPs = () => Array.from(blockedIPs);

/**
 * Get suspicious IP activity
 */
const getSuspiciousActivity = () => {
  const activity = [];
  for (const [ip, data] of suspiciousIPs.entries()) {
    activity.push({ ip, ...data });
  }
  return activity.sort((a, b) => b.count - a.count);
};

module.exports = {
  ipBlocker,
  blockIP,
  unblockIP,
  getBlockedIPs,
  getSuspiciousActivity,
};
