const SecurityEvent = require('../models/SecurityEvent');
const Invitation = require('../models/Invitation');

/**
 * Evaluates an incoming access attempt for anomalies and updates the 
 * confidence score of the invitation.
 * 
 * @param {Object} req - Express request object
 * @param {Object} invitation - The MongoDB Invitation document
 * @returns {Object} - { isLeak: boolean, reason: string, updatedConfidence: number }
 */
exports.evaluateAccessRisk = async (req, invitation) => {
  let penalty = 0;
  let reason = null;
  const currentIp = req.ip || req.connection.remoteAddress;

  // 1. Device Mismatch Heuristic
  // If the gateway middleware already failed the exact device match, it calls this
  // to evaluate the risk.
  if (invitation.trustedDevice && invitation.trustedDevice.fingerprintHash) {
    penalty += 50;
    reason = 'device_mismatch';
  }

  // 2. IP Location / Impossible Travel (Simplified)
  // In a real app, use MaxMind GeoIP to check distance.
  if (invitation.trustedDevice && invitation.trustedDevice.ip !== currentIp) {
    // IP changed. Could be legitimate (switching from Wi-Fi to cellular).
    penalty += 10;
    if (!reason) reason = 'ip_change';
  }

  // Update confidence score
  const newScore = Math.max(0, invitation.confidenceScore - penalty);
  
  if (penalty > 0) {
    invitation.confidenceScore = newScore;
    invitation.leakReason = reason;
    await invitation.save();
    
    // Log the security event
    await SecurityEvent.create({
      invitationId: invitation._id,
      linkId: invitation.linkId,
      eventType: reason === 'device_mismatch' ? 'device_mismatch' : 'unauthorized_access',
      attemptedFingerprint: req.headers['user-agent'] || 'unknown',
      ipAddress: currentIp,
      confidenceOfLeak: penalty,
    });
  }

  return {
    isLeak: newScore < 50, // Arbitrary threshold
    reason,
    updatedConfidence: newScore
  };
};
