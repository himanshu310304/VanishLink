const InvitationEvent = require('../models/InvitationEvent');
const Invitation = require('../models/Invitation');

/**
 * Leak Detection Engine for Zero-Trust Access
 */
class LeakDetectionEngine {
  /**
   * Evaluate a request for an invitation to detect anomalies (like shared links).
   * @param {Object} invitation The invitation document from MongoDB
   * @param {Object} requestContext { ip, userAgent, deviceFingerprint, country }
   * @returns {Object} { allowed: boolean, reason: string, scoreDrop: number, isLeak: boolean }
   */
  async evaluateAccess(invitation, requestContext) {
    if (invitation.status !== 'verified') {
      return { allowed: false, reason: 'Invitation is not verified yet.', scoreDrop: 0, isLeak: false };
    }
    
    if (invitation.status === 'frozen' || invitation.status === 'revoked') {
      return { allowed: false, reason: `Invitation has been ${invitation.status}.`, scoreDrop: 0, isLeak: false };
    }

    const { trustedDevice } = invitation;
    const { deviceFingerprint, ip, userAgent } = requestContext;
    
    let scoreDrop = 0;
    let reasons = [];
    let isLeak = false;

    // Primary check: Device Fingerprint (from secure HttpOnly cookie)
    if (!deviceFingerprint || deviceFingerprint !== trustedDevice.fingerprint) {
      scoreDrop += 50;
      reasons.push('Missing or mismatched device fingerprint cookie.');
      isLeak = true;
    }

    // Secondary checks if fingerprint matched but environment changed drastically
    // Example: Same cookie but completely different User-Agent or IP
    if (userAgent !== trustedDevice.userAgent) {
      scoreDrop += 20;
      reasons.push('User-Agent changed significantly.');
    }
    
    // We could add Geo-IP impossible travel checks here if we had a GeoIP service
    // if (ip !== trustedDevice.ip) { ... }

    const newScore = Math.max(0, invitation.confidenceScore - scoreDrop);
    const allowed = newScore >= 50; // Threshold

    return {
      allowed,
      reason: reasons.join(' ') || 'Device matched.',
      scoreDrop,
      isLeak,
      newScore
    };
  }

  /**
   * Record the outcome and update the invitation state if necessary.
   */
  async recordEventAndReact(invitation, requestContext, evaluationResult) {
    const { allowed, reason, scoreDrop, isLeak, newScore } = evaluationResult;
    
    let eventType = isLeak ? 'leak_detected' : 'access_attempt';
    
    // Update invitation score and status if needed
    if (scoreDrop > 0 || isLeak) {
      invitation.confidenceScore = newScore;
      
      if (!allowed && invitation.status === 'verified') {
        invitation.status = 'frozen';
        eventType = 'frozen';
        // Note: A real system would trigger an async email/webhook notification to the creator here
        console.warn(`[LEAK DETECTED] Invitation ${invitation._id} frozen. Reason: ${reason}`);
      }
      await invitation.save();
    }

    // Create the Audit Log event
    await InvitationEvent.create({
      invitationId: invitation._id,
      linkId: invitation.linkId,
      eventType: eventType,
      success: allowed,
      failureReason: allowed ? null : reason,
      ip: requestContext.ip,
      userAgent: requestContext.userAgent,
      country: requestContext.country || 'Unknown',
      deviceFingerprint: requestContext.deviceFingerprint
    });

    return allowed;
  }
}

module.exports = new LeakDetectionEngine();
