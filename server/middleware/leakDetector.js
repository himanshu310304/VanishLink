const SecurityEvent = require('../models/SecurityEvent');
const Link = require('../models/Link');

/**
 * Middleware applied to standard link access (e.g. /api/links/:slug)
 * If the link is RecipientBound, we block access immediately and log a brute-force or enumeration event.
 */
exports.detectDirectAccessAttempt = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const link = await Link.findOne({ slug });

    if (!link) {
      return next(); // Let normal 404 handle it
    }

    if (link.isRecipientBound) {
      // Direct access is forbidden for zero-trust links.
      // Must use /secure/:token
      
      await SecurityEvent.create({
        linkId: link._id,
        eventType: 'unauthorized_access',
        attemptedFingerprint: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress,
        confidenceOfLeak: 20, // Low confidence since it could just be a random guess, but we log it
      });

      return res.status(403).json({ 
        message: 'This secure link requires an invitation token. Access denied.' 
      });
    }

    next();
  } catch (error) {
    console.error('Leak Detector Error:', error);
    next(error);
  }
};
