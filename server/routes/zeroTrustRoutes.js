const express = require('express');
const router = express.Router();
const zeroTrustController = require('../controllers/zeroTrustController');
const { requireZeroTrust } = require('../middleware/zeroTrustAuth');

// Requests a real OTP to be sent via email
router.post('/request-otp', zeroTrustController.requestOtp);

// Verifies OTP and moves invitation to 'verified' state
router.post('/verify', zeroTrustController.verifyIdentity);

// Registers device fingerprint for a verified invitation
router.post('/register-device', zeroTrustController.registerDevice);

// Gateway access to the protected resource
router.get('/access/:token', requireZeroTrust, zeroTrustController.accessLink);

module.exports = router;
