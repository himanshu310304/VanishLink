const express = require('express');
const crypto = require('crypto');
const Link = require('../models/Link');
const Invitation = require('../models/Invitation');
const InvitationEvent = require('../models/InvitationEvent');
const leakDetection = require('../security/leakDetection');
const { authenticate } = require('./authRoutes'); // Assuming this exports authenticate middleware

const router = express.Router();

/**
 * Helper to generate secure token
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 1. CREATOR: Generate invitations for a link
 * POST /api/invitations/link/:linkId
 */
router.post('/link/:linkId', authenticate, async (req, res) => {
  try {
    const { linkId } = req.params;
    const { recipients } = req.body; // Array of { email, name }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'Recipients array is required.' });
    }

    const link = await Link.findOne({ _id: linkId, ownerEmail: req.user.email });
    if (!link) {
      return res.status(404).json({ message: 'Link not found or unauthorized.' });
    }

    if (!link.isRecipientBound) {
      return res.status(400).json({ message: 'This link is not configured for recipient-bound sharing.' });
    }

    const createdInvitations = [];
    for (const rec of recipients) {
      // Check if already invited
      const existing = await Invitation.findOne({ linkId, recipientEmail: rec.email });
      if (existing) continue;

      const token = generateSecureToken();
      const inv = await Invitation.create({
        linkId,
        recipientEmail: rec.email,
        recipientName: rec.name,
        token
      });
      
      createdInvitations.push({
        email: inv.recipientEmail,
        token: inv.token,
        inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inv.token}` // The URL the user will get
      });
      // In a real system, send email here!
    }

    res.json({ message: 'Invitations generated', invitations: createdInvitations });
  } catch (error) {
    console.error('Error creating invitations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 2. CREATOR: List invitations for a link
 * GET /api/invitations/link/:linkId
 */
router.get('/link/:linkId', authenticate, async (req, res) => {
  try {
    const { linkId } = req.params;
    const link = await Link.findOne({ _id: linkId, ownerEmail: req.user.email });
    if (!link) return res.status(404).json({ message: 'Link not found' });

    const invitations = await Invitation.find({ linkId }).sort({ createdAt: -1 });
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 3. RECIPIENT: Get invitation details (masked)
 * GET /api/invitations/:token
 */
router.get('/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token }).populate('linkId', 'title isRecipientBound allowedVerificationMethods');
    if (!invitation) return res.status(404).json({ message: 'Invalid invitation token.' });

    res.json({
      email: invitation.recipientEmail,
      name: invitation.recipientName,
      status: invitation.status,
      link: {
        title: invitation.linkId.title,
        allowedVerificationMethods: invitation.linkId.allowedVerificationMethods
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 4. RECIPIENT: Verify identity and register device
 * POST /api/invitations/:token/verify
 * Body: { otp } (In real app, we'd have a step to request OTP first)
 */
router.post('/:token/verify', async (req, res) => {
  try {
    const { otp, password } = req.body;
    const invitation = await Invitation.findOne({ token: req.params.token }).populate('linkId');
    if (!invitation) return res.status(404).json({ message: 'Invalid invitation token.' });

    if (invitation.status === 'revoked') {
      return res.status(403).json({ message: 'Invitation has been revoked.' });
    }

    // SIMULATED VERIFICATION for demo
    // In reality, verify OTP against DB or verify password
    let verified = false;
    
    if (invitation.linkId.allowedVerificationMethods.includes('email_otp') && otp === '123456') {
      verified = true; // Hardcoded OTP for demo
    } else if (invitation.linkId.allowedVerificationMethods.includes('password') && password === invitation.linkId.password) {
      verified = true;
    }

    if (!verified) {
      return res.status(401).json({ message: 'Verification failed.' });
    }

    // Device Registration
    const deviceFingerprint = crypto.randomUUID(); // Give them a unique cookie
    
    invitation.status = 'verified';
    invitation.trustedDevice = {
      fingerprint: deviceFingerprint,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      registeredAt: new Date()
    };
    await invitation.save();

    // Log event
    await InvitationEvent.create({
      invitationId: invitation._id,
      linkId: invitation.linkId._id,
      eventType: 'verified',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint
    });

    // Set secure HttpOnly cookie for device binding
    res.cookie('device_fingerprint', deviceFingerprint, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ message: 'Verified successfully. Device registered.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 5. RECIPIENT: Access the link target (Zero-Trust Gate)
 * GET /api/invitations/:token/access
 */
router.get('/:token/access', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token }).populate('linkId');
    if (!invitation) return res.status(404).json({ message: 'Invalid invitation.' });

    // Parse cookie (requires cookie-parser in app, or manual parsing)
    // For simplicity, we manually parse if cookie-parser isn't available
    let deviceFingerprint = null;
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)device_fingerprint=([^;]*)/);
      if (match) deviceFingerprint = match[1];
    }

    const requestContext = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint
    };

    // Evaluate risk
    const isAllowed = await leakDetection.recordEventAndReact(invitation, requestContext, await leakDetection.evaluateAccess(invitation, requestContext));

    if (!isAllowed) {
      return res.status(403).json({ message: 'Access denied. Security anomaly detected.' });
    }

    res.json({ targetUrl: invitation.linkId.targetUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 6. CREATOR: Revoke an invitation
 * POST /api/invitations/:token/revoke
 */
router.post('/:token/revoke', authenticate, async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token }).populate('linkId');
    if (!invitation) return res.status(404).json({ message: 'Not found.' });
    
    // Ensure creator owns it
    if (invitation.linkId.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    invitation.status = 'revoked';
    await invitation.save();

    await InvitationEvent.create({
      invitationId: invitation._id,
      linkId: invitation.linkId._id,
      eventType: 'revoked',
      success: true,
      ip: req.ip
    });

    res.json({ message: 'Invitation revoked.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal error' });
  }
});

/**
 * 7. CREATOR: Get timeline events for an invitation
 * GET /api/invitations/:token/events
 */
router.get('/:token/events', authenticate, async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token }).populate('linkId');
    if (!invitation || invitation.linkId.ownerEmail !== req.user.email) {
      return res.status(404).json({ message: 'Not found or unauthorized.' });
    }

    const events = await InvitationEvent.find({ invitationId: invitation._id }).sort({ timestamp: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Internal error' });
  }
});

module.exports = router;
