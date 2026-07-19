const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5050/api/auth/google/callback';

// Google OAuth Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        passReqToCallback: true, // Pass request to callback to access state
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email from Google'), null);
          }

          const state = req.query.state; // 'login', 'register', or 'admin'
          let user = await User.findOne({ email });

          // LOGIN FLOW: User must exist AND must be regular user (not admin)
          if (state === 'login') {
            console.log('🔍 OAuth Login flow - checking user:', email);
            if (!user) {
              console.log('❌ User not found');
              return done(null, false, { message: 'no_account' });
            }
            console.log('👤 User found with role:', user.role);
            // Block admins from using user login page
            if (user.role === 'admin') {
              console.log('🚫 Admin detected using user login - blocking');
              return done(null, false, { message: 'use_admin_login' });
            }
            user.lastLoginAt = new Date();
            await user.save();
            return done(null, user);
          }

          // REGISTER FLOW: User must NOT exist, creates as regular user only
          if (state === 'register') {
            if (user) {
              return done(null, false, { message: 'account_exists' });
            }
            user = await User.create({
              name: profile.displayName || email.split('@')[0],
              email,
              authProvider: 'google',
              providerId: profile.id,
              password: null,
              role: 'user', // Always create as user, never admin
            });
            return done(null, user);
          }

          // ADMIN FLOW: Login if exists, create with admin role if not
          if (state === 'admin') {
            if (!user) {
              user = await User.create({
                name: profile.displayName || email.split('@')[0],
                email,
                authProvider: 'google',
                providerId: profile.id,
                password: null,
                role: 'admin',
              });
            } else if (user.role !== 'admin') {
              return done(null, false, { message: 'not_admin' });
            }
            user.lastLoginAt = new Date();
            await user.save();
            return done(null, user);
          }

          // FALLBACK: No state provided (shouldn't happen)
          return done(new Error('Invalid OAuth state'), null);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
