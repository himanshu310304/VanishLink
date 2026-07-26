const Invitation = require('../models/Invitation');
const Link = require('../models/Link');
const fingerprintService = require('../services/fingerprintService');
const riskScoringService = require('../services/riskScoringService');

exports.requireZeroTrust = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(401).json({ message: 'Zero-Trust access requires an invitation token.' });
    }

    const invitation = await Invitation.findOne({ token }).populate('linkId');
    if (!invitation) {
      return res.status(404).json({ message: 'Invalid or expired invitation.' });
    }

    const link = invitation.linkId;
    if (invitation.status === 'frozen') {
      return res.status(403).json({ message: 'This invitation has been frozen due to suspicious activity.' });
    }
    if (invitation.status === 'revoked') {
      return res.status(403).json({ message: 'This invitation has been revoked by the creator.' });
    }
    if (invitation.status === 'pending') {
      return res.status(403).json({ message: 'Verification required before access.' });
    }

    // Verify device binding
    const isMatch = fingerprintService.matchFingerprint(req, invitation.trustedDevice?.fingerprint);
    
    if (!isMatch) {
      // Fingerprint mismatch - evaluate leak risk
      const { isLeak } = await riskScoringService.evaluateAccessRisk(req, invitation);
      
      if (isLeak && link.leakAction === 'freeze') {
        invitation.status = 'frozen';
        await invitation.save();
      }
      
      // We do not tell the user WHY they are blocked to avoid tipping off attackers
      return res.status(403).json({ message: 'Access Denied. Device not recognized.' });
    }

    // All clear, attach link and invitation to req
    req.zeroTrust = { link, invitation };
    next();
  } catch (error) {
    console.error('Zero-Trust Auth Error:', error);
    res.status(500).json({ message: 'Internal server error during Zero-Trust validation.' });
  }
};
