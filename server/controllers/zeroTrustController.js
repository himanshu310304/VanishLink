const Invitation = require('../models/Invitation');
const fingerprintService = require('../services/fingerprintService');
const { sendOTP } = require('../utils/emailService');

// Verify identity (Simulated OTP for demonstration)
exports.requestOtp = async (req, res) => {
  try {
    const { token } = req.body;
    const invitation = await Invitation.findOne({ token }).populate('linkId');
    if (!invitation) return res.status(404).json({ message: 'Invalid invitation token.' });

    const allowedMethods = invitation.linkId.allowedVerificationMethods || [];
    if (!allowedMethods.includes('email_otp')) {
      return res.status(400).json({ message: 'Email OTP is not enabled for this link.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    invitation.currentOtp = otp;
    invitation.otpExpiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes
    await invitation.save();

    await sendOTP(invitation.recipientEmail, otp, 'VanishLink Verification');

    res.status(200).json({ message: `OTP sent to ${invitation.recipientEmail}` });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

exports.verifyIdentity = async (req, res) => {
  try {
    const { token, otp, password } = req.body;

    const invitation = await Invitation.findOne({ token }).populate('linkId');
    if (!invitation) return res.status(404).json({ message: 'Invalid invitation token.' });

    if (invitation.status === 'frozen' || invitation.status === 'revoked') {
      return res.status(403).json({ message: 'Invitation is not active.' });
    }

    const link = invitation.linkId;
    const allowedMethods = link.allowedVerificationMethods || [];

    // OTP VERIFICATION
    if (allowedMethods.includes('email_otp')) {
      if (!invitation.currentOtp || invitation.currentOtp !== otp) { 
        return res.status(401).json({ message: 'Invalid OTP.' });
      }
      if (new Date() > invitation.otpExpiresAt) {
        return res.status(401).json({ message: 'OTP has expired. Please request a new one.' });
      }
    }

    // PASSWORD VERIFICATION
    if (allowedMethods.includes('password')) {
      if (password !== link.password) {
        return res.status(401).json({ message: 'Invalid link password.' });
      }
    }

    // Mark as verified but we still need device registration
    if (invitation.status === 'pending') {
      invitation.status = 'verified';
      await invitation.save();
    }

    res.status(200).json({ message: 'Verification successful. Proceed to device registration.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during verification.' });
  }
};

// Register device fingerprint
exports.registerDevice = async (req, res) => {
  try {
    const { token } = req.body;
    const invitation = await Invitation.findOne({ token });
    
    if (!invitation || invitation.status !== 'verified') {
      return res.status(403).json({ message: 'Requires verification first.' });
    }

    // Only register if not already registered to a DIFFERENT device (leak prevention)
    const fingerprintHash = fingerprintService.generateFingerprint(req);
    if (invitation.trustedDevice && invitation.trustedDevice.fingerprint) {
      if (invitation.trustedDevice.fingerprint !== fingerprintHash) {
         // Different device trying to register - this is a leak!
         return res.status(403).json({ message: 'Device mismatch. Invitation is already bound to another device.' });
      }
      // Same device re-verifying, which is perfectly fine. Just update timestamp.
      invitation.trustedDevice.registeredAt = new Date();
      await invitation.save();
      return res.status(200).json({ message: 'Device re-verified successfully.' });
    }

    
    invitation.trustedDevice = {
      fingerprint: fingerprintHash,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      registeredAt: new Date()
    };
    
    await invitation.save();

    res.status(200).json({ message: 'Device registered successfully. You now have access.' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering device.' });
  }
};

// Final gateway to target url
exports.accessLink = async (req, res) => {
  try {
    const { link, invitation } = req.zeroTrust;

    // Enforce max access count
    if (link.maxClicks > 0 && link.clicks >= link.maxClicks) {
      return res.status(403).json({ message: 'Access Denied. This link has reached its maximum access limit.' });
    }

    // Increment clicks and save
    link.clicks += 1;
    await link.save();

    const host = req.get('host');
    const protocol = req.protocol;
    const clientFp = req.headers['x-device-fingerprint'] || 'no-client-fp';
    const secureUrl = `${protocol}://${host}/secure-view/${token}?fp=${clientFp}`;

    res.status(200).json({ 
      message: 'Access granted.',
      targetUrl: secureUrl,
      invitationStatus: invitation.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Error granting access.' });
  }
};
