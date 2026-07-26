const crypto = require('crypto');

/**
 * Generates a server-side hash of the client's fingerprint based on headers.
 * In a real-world scenario, this might be combined with a client-side generated
 * fingerprint (e.g., Canvas, WebGL, Screen Res) sent in the request body.
 * 
 * @param {Object} req - Express request object
 * @returns {String} - SHA-256 hash representing the device
 */
exports.generateFingerprint = (req) => {
  // Use client-provided fingerprint if available, otherwise fallback to basic headers
  const clientProvidedFP = req.body?.deviceFingerprint || req.headers['x-device-fingerprint'] || req.query?.fp;
  
  const rawData = [
    clientProvidedFP || 'no-client-fp',
    req.headers['user-agent'] || 'unknown-ua',
    // We intentionally exclude IP from the exact fingerprint hash because IPs change often (mobile networks)
    // IP changes are handled by the Leak Heuristic Engine, not strict device matching.
  ].join('|');

  console.log(`[Fingerprint] Method: ${req.method}, Path: ${req.path}`);
  console.log(`[Fingerprint] Raw Data: ${rawData}`);
  
  const hash = crypto.createHash('sha256').update(rawData).digest('hex');
  console.log(`[Fingerprint] Hash: ${hash}`);
  return hash;
};

/**
 * Compares an incoming request fingerprint to a trusted fingerprint hash.
 */
exports.matchFingerprint = (req, trustedHash) => {
  if (!trustedHash) return false;
  const incomingHash = exports.generateFingerprint(req);
  return incomingHash === trustedHash;
};
