const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const AuditLog = require('../models/AuditLog');
const { sendOTP } = require('../utils/emailService');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const TOKEN_TTL = '7d';
const OTP_TTL_MINUTES = 10;

function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
	return jwt.sign(
		{
			sub: user._id.toString(),
			email: user.email,
			role: user.role,
		},
		JWT_SECRET,
		{ expiresIn: TOKEN_TTL }
	);
}

// POST /api/auth/register/initiate { name, email, password, role?, adminSecurityKey? }
router.post('/register/initiate', async (req, res) => {
	try {
		const { name, email, password, role, adminSecurityKey } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({ message: 'All fields required' });
		}

		if (password.length < 6) {
			return res
				.status(400)
				.json({ message: 'Password must be at least 6 characters' });
		}

		// Security Check: Only allow admin registration if the Master Security Key matches
		let userRole = 'user';
		if (role === 'admin') {
			if (adminSecurityKey !== process.env.ADMIN_SECURITY_KEY) {
				return res.status(403).json({ message: 'Invalid Master Security Key. Admin clearance denied.' });
			}
			userRole = 'admin';
		}

		const existing = await User.findOne({ email });
		if (existing) {
			return res.status(409).json({ message: 'Email already registered' });
		}

		const code = generateOTP();
		const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

		const passwordHash = await bcrypt.hash(password, 10);

		await OTP.deleteMany({ email, purpose: 'register' });
		await OTP.create({
			email,
			code,
			purpose: 'register',
			expiresAt,
			meta: { name, passwordHash, role: userRole },
		});

		const result = await sendOTP(email, code, 'register');

		const responsePayload = {
			message: 'Registration code sent',
			mode: result.mode,
		};
		if (result.mode === 'console') {
			responsePayload.devCode = code;
		}
		return res.json(responsePayload);
	} catch (err) {
		console.error('Register initiate failed', err);
		return res.status(500).json({ message: 'Registration initiation failed' });
	}
});

// POST /api/auth/register/verify { email, code }
router.post('/register/verify', async (req, res) => {
	try {
		const { email, code } = req.body;

		if (!email || !code) {
			return res.status(400).json({ message: 'Email and code required' });
		}

		const otpRecord = await OTP.findOne({ email, code, purpose: 'register' });
		if (!otpRecord) {
			return res.status(401).json({ message: 'Invalid or expired code' });
		}

		if (new Date() > otpRecord.expiresAt) {
			await OTP.deleteOne({ _id: otpRecord._id });
			return res.status(401).json({ message: 'Code expired' });
		}

		const { name, passwordHash, role } = otpRecord.meta || {};
		if (!name || !passwordHash) {
			await OTP.deleteOne({ _id: otpRecord._id });
			return res.status(400).json({ message: 'Registration data missing' });
		}

		const exists = await User.findOne({ email });
		if (exists) {
			await OTP.deleteOne({ _id: otpRecord._id });
			return res.status(409).json({ message: 'Email already registered' });
		}

		const user = await User.create({
			name,
			email,
			password: passwordHash,
			role: role || 'user',
		});

		await OTP.deleteOne({ _id: otpRecord._id });

		const token = signToken(user);

		return res.json({
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (err) {
		console.error('Register verify failed', err);
		return res.status(500).json({ message: 'Registration verification failed' });
	}
});

// POST /api/auth/login { email, password }
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ message: 'Email and password required' });
		}

		const user = await User.findOne({ email });
		if (!user) {
			// Log failed login attempt
			if (email.includes('@')) {
				try {
					await AuditLog.create({
						action: 'LOGIN_FAILED',
						adminId: '000000000000000000000000',
						adminEmail: email,
						adminName: 'Unknown',
						target: 'Failed login - user not found',
						ip: req.ip || req.connection.remoteAddress || 'unknown',
						userAgent: req.get('user-agent') || 'unknown',
					});
				} catch (auditErr) {
					console.error('Failed to log failed login:', auditErr.message);
				}
			}
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		// Check if user is banned
		if (user.status === 'banned') {
			console.log(`🚫 Banned user attempted login: ${user.email}`);
			return res.status(403).json({ 
				message: 'Your account has been banned. Please contact support.' 
			});
		}

		const isMatch = await user.comparePassword(password);
		if (!isMatch) {
			// Log failed login attempt
			try {
				await AuditLog.create({
					action: 'LOGIN_FAILED',
					adminId: user._id,
					adminEmail: user.email,
					adminName: user.name,
					target: 'Failed login - incorrect password',
					ip: req.ip || req.connection.remoteAddress || 'unknown',
					userAgent: req.get('user-agent') || 'unknown',
				});
			} catch (auditErr) {
				console.error('Failed to log failed login:', auditErr.message);
			}
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		user.lastLoginAt = new Date();
		await user.save();

		const token = signToken(user);

		// Log successful admin login
		if (user.role === 'admin') {
			try {
				await AuditLog.create({
					action: 'LOGIN_ADMIN',
					adminId: user._id,
					adminEmail: user.email,
					adminName: user.name,
					target: 'Admin login successful',
					ip: req.ip || req.connection.remoteAddress || 'unknown',
					userAgent: req.get('user-agent') || 'unknown',
				});
				console.log(`🔐 Admin logged in: ${user.email}`);
			} catch (auditErr) {
				console.error('Failed to log admin login:', auditErr.message);
			}
		}

		return res.json({
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (err) {
		console.error('Login failed', err);
		return res.status(500).json({ message: 'Login failed' });
	}
});

// POST /api/auth/forgot-password { email }
router.post('/forgot-password', async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) {
			return res.status(400).json({ message: 'Email required' });
		}

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: 'Email not found' });
		}

		const code = generateOTP();
		const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

		await OTP.deleteMany({ email, purpose: 'reset' });
		await OTP.create({ email, code, purpose: 'reset', expiresAt });

		const result = await sendOTP(email, code, 'reset');

		const responsePayload = {
			message: 'Reset code sent',
			mode: result.mode,
		};
		if (result.mode === 'console') {
			responsePayload.devCode = code;
		}
		return res.json(responsePayload);
	} catch (err) {
		console.error('Forgot password failed', err);
		return res.status(500).json({ message: 'Failed to send reset code' });
	}
});

// POST /api/auth/reset-password { email, code, newPassword }
router.post('/reset-password', async (req, res) => {
	try {
		let { email, code, newPassword } = req.body;
		
		// Trim whitespace from inputs
		email = email?.trim();
		code = code?.trim();

		if (!email || !code || !newPassword) {
			return res.status(400).json({ message: 'All fields required' });
		}

		if (newPassword.length < 6) {
			return res
				.status(400)
				.json({ message: 'Password must be at least 6 characters' });
		}

		console.log('🔍 Reset password attempt:', { email, code: code, purpose: 'reset' });
		
		// Find all OTPs for debugging
		const allOtps = await OTP.find({ email, purpose: 'reset' });
		console.log('📧 All OTPs for this email:', allOtps.map(o => ({ code: o.code, expiresAt: o.expiresAt, created: o.createdAt })));

		const otpRecord = await OTP.findOne({ email, code, purpose: 'reset' });
		console.log('✅ Matching OTP found:', otpRecord ? 'YES' : 'NO');
		
		if (!otpRecord) {
			return res.status(401).json({ message: 'Invalid or expired code' });
		}

		if (new Date() > otpRecord.expiresAt) {
			await OTP.deleteOne({ _id: otpRecord._id });
			return res.status(401).json({ message: 'Code expired' });
		}

		const user = await User.findOne({ email });
		if (!user) {
			await OTP.deleteOne({ _id: otpRecord._id });
			return res.status(404).json({ message: 'User not found' });
		}

		user.password = newPassword;
		await user.save();

		await OTP.deleteOne({ _id: otpRecord._id });

		return res.json({ message: 'Password reset successful' });
	} catch (err) {
		console.error('Reset password failed', err);
		return res.status(500).json({ message: 'Password reset failed' });
	}
});

// Middleware to protect routes
function authenticate(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ')
		? authHeader.slice(7)
		: null;

	if (!token) return res.status(401).json({ message: 'Missing token' });

	try {
		const payload = jwt.verify(token, JWT_SECRET);
		req.user = payload;
		return next();
	} catch (err) {
		return res.status(401).json({ message: 'Invalid token' });
	}
}

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
	try {
		const user = await User.findById(req.user.sub);
		if (!user) return res.status(404).json({ message: 'User not found' });

		return res.json({
			user: {
				id: user._id,
				email: user.email,
				name: user.name,
				role: user.role,
				avatar: user.avatar,
				createdAt: user.createdAt,
			},
		});
	} catch (err) {
		console.error('Auth me failed', err);
		return res.status(500).json({ message: 'Internal error' });
	}
});

// ---- OAuth Routes ----
const passport = require('passport');
require('../config/passport'); // Initialize passport strategies

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const isGoogleConfigured = () => {
	return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

const getOrCreateMockUser = async (email, name, role) => {
	let user = await User.findOne({ email });
	if (!user) {
		user = await User.create({
			name: name,
			email: email,
			authProvider: 'google',
			providerId: 'mock-google-id-' + Math.random().toString(36).substring(2, 9),
			password: null,
			role: role,
		});
	}
	return user;
};

// Google OAuth - Login only (check if user exists)
router.get('/google/login', async (req, res, next) => {
	if (!isGoogleConfigured()) {
		console.log('⚠️ Google OAuth is not configured on the server. Simulating Google Login...');
		try {
			// Find or create a default mock user for testing login
			const user = await getOrCreateMockUser('google-user@example.com', 'Mock Google User', 'user');
			user.lastLoginAt = new Date();
			await user.save();
			
			const token = signToken(user);
			return res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
		} catch (err) {
			console.error('Mock Google Login failed:', err);
			return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
		}
	}
	passport.authenticate('google', { scope: ['profile', 'email'], session: false, state: 'login' })(req, res, next);
});

// Google OAuth - Register only (create new user)
router.get('/google/register', async (req, res, next) => {
	if (!isGoogleConfigured()) {
		console.log('⚠️ Google OAuth is not configured on the server. Simulating Google Registration...');
		try {
			// Create a new unique mock user for registration testing
			const rand = Math.random().toString(36).substring(2, 7);
			const user = await getOrCreateMockUser(`google-register-${rand}@example.com`, `Google Register ${rand}`, 'user');
			
			const token = signToken(user);
			return res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
		} catch (err) {
			console.error('Mock Google Registration failed:', err);
			return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
		}
	}
	passport.authenticate('google', { scope: ['profile', 'email'], session: false, state: 'register' })(req, res, next);
});

// Google OAuth - Admin Login
router.get('/google/admin', async (req, res, next) => {
	if (!isGoogleConfigured()) {
		console.log('⚠️ Google OAuth is not configured on the server. Simulating Google Admin Login...');
		try {
			const user = await getOrCreateMockUser('google-admin@example.com', 'Mock Google Admin', 'admin');
			user.lastLoginAt = new Date();
			await user.save();
			
			const token = signToken(user);
			return res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
		} catch (err) {
			console.error('Mock Google Admin login failed:', err);
			return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
		}
	}
	passport.authenticate('google', { scope: ['profile', 'email'], session: false, state: 'admin' })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
	if (!isGoogleConfigured()) {
		return res.redirect(`${FRONTEND_URL}/login?error=oauth_unconfigured`);
	}
	passport.authenticate('google', { session: false }, async (err, user, info) => {
		if (err) {
			console.error('Google OAuth error:', err);
			return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
		}
		
		if (!user) {
			// Handle specific error messages
			console.log('🔍 OAuth callback - no user. Info:', info);
			if (info?.message === 'no_account') {
				console.log('❌ No account found - redirecting to login');
				return res.redirect(`${FRONTEND_URL}/login?error=no_account`);
			}
			if (info?.message === 'account_exists') {
				console.log('❌ Account exists - redirecting to register');
				return res.redirect(`${FRONTEND_URL}/register?error=account_exists`);
			}
			if (info?.message === 'not_admin') {
				console.log('❌ Not admin - redirecting to admin login');
				return res.redirect(`${FRONTEND_URL}/admin/login?error=not_admin`);
			}
			if (info?.message === 'use_admin_login') {
				console.log('🔐 Admin using user login - redirecting with error');
				console.log('📍 Redirect URL:', `${FRONTEND_URL}/login?error=use_admin_login`);
				return res.redirect(`${FRONTEND_URL}/login?error=use_admin_login`);
			}
			console.error('Google OAuth: no user returned');
			return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
		}

		const token = signToken(user);
		return res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
	})(req, res, next);
});

// PATCH /api/auth/update-profile - Update user profile
router.patch('/update-profile', authenticate, async (req, res) => {
	try {
		const { name } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({ message: 'Name is required' });
		}

		const user = await User.findById(req.user.sub);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		user.name = name.trim();
		await user.save();

		return res.json({
			message: 'Profile updated successfully',
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
				avatar: user.avatar,
				createdAt: user.createdAt
			}
		});
	} catch (err) {
		console.error('Error updating profile:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// PATCH /api/auth/change-password - Change user password
router.patch('/change-password', authenticate, async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({ message: 'Current password and new password are required' });
		}

		if (newPassword.length < 6) {
			return res.status(400).json({ message: 'New password must be at least 6 characters' });
		}

		const user = await User.findById(req.user.sub);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Verify current password
		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			return res.status(401).json({ message: 'Current password is incorrect' });
		}

		// Hash new password
		const salt = await bcrypt.genSalt(10);
		user.password = await bcrypt.hash(newPassword, salt);
		await user.save();

		return res.json({ message: 'Password changed successfully' });
	} catch (err) {
		console.error('Error changing password:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// Update profile avatar
router.patch('/update-avatar', authenticate, async (req, res) => {
	try {
		const { avatar } = req.body;

		if (!avatar) {
			return res.status(400).json({ message: 'Avatar image is required' });
		}

		// Validate base64 image format
		if (!avatar.startsWith('data:image/')) {
			return res.status(400).json({ message: 'Invalid image format' });
		}

		// Check file size (base64 is ~33% larger than original, so 5MB * 1.33 ≈ 6.65MB)
		const sizeInBytes = (avatar.length * 3) / 4;
		const maxSize = 5 * 1024 * 1024; // 5MB

		if (sizeInBytes > maxSize) {
			return res.status(400).json({ message: 'Image size exceeds 5MB limit' });
		}

		const user = await User.findById(req.user.sub);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		user.avatar = avatar;
		await user.save();

		res.json({ 
			message: 'Profile picture updated successfully',
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
				avatar: user.avatar,
				createdAt: user.createdAt
			}
		});
	} catch (err) {
		console.error('Error updating avatar:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// Remove profile avatar
router.delete('/remove-avatar', authenticate, async (req, res) => {
	try {
		const user = await User.findById(req.user.sub);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		user.avatar = null;
		await user.save();

		res.json({ 
			message: 'Profile picture removed successfully',
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
				avatar: user.avatar,
				createdAt: user.createdAt
			}
		});
	} catch (err) {
		console.error('Error removing avatar:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// Delete user account permanently
router.delete('/delete-account', authenticate, async (req, res) => {
	try {
		const userId = req.user.sub;

		// Find user
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Delete all user's data
		const Link = require('../models/Link');
		const AnalyticsEvent = require('../models/AnalyticsEvent');
		const FlagReport = require('../models/FlagReport');

		// Delete user's links
		await Link.deleteMany({ user: userId });
		
		// Delete user's analytics events
		await AnalyticsEvent.deleteMany({ linkId: { $in: await Link.find({ user: userId }).distinct('_id') } });
		
		// Delete user's reports (both submitted and received)
		await FlagReport.deleteMany({ $or: [{ reportedBy: userId }, { linkId: { $in: await Link.find({ user: userId }).distinct('_id') } }] });

		// Delete user account
		await User.findByIdAndDelete(userId);

		res.json({ message: 'Account deleted successfully' });
	} catch (err) {
		console.error('Error deleting account:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

module.exports = { router, authenticate };
