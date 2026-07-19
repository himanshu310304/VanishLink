// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const SystemSettings = require('../models/SystemSettings');

// Dynamic settings (updated from database)
let generalMax = 1000;
let authMax = 20;
let linkCreationMax = 100;

// Load settings from database
const loadSettings = async () => {
  try {
    const settings = await SystemSettings.getSettings();
    if (settings) {
      generalMax = settings.rateLimitGeneral?.max || 1000;
      authMax = settings.rateLimitAuth?.max || 20;
      linkCreationMax = settings.rateLimitLinkCreation?.max || 100;
      console.log(`🔧 Rate limiter settings loaded: General=${generalMax}, Auth=${authMax}, Links=${linkCreationMax}`);
    }
  } catch (err) {
    console.error('Failed to load rate limiter settings, using defaults:', err.message);
  }
};

// Export reload function for immediate updates
if (!global.reloadSettingsFunctions) {
  global.reloadSettingsFunctions = [];
}
global.reloadSettingsFunctions.push(loadSettings);

// Global reload function that triggers all middleware reloads
global.reloadSettings = async () => {
  if (global.reloadSettingsFunctions) {
    for (const fn of global.reloadSettingsFunctions) {
      await fn();
    }
  }
};

// Reload settings every 5 minutes (backup)
setInterval(loadSettings, 5 * 60 * 1000);

// Load settings on startup (after MongoDB connects)
setTimeout(loadSettings, 2000);

// General API rate limiter - uses dynamic max from settings
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => generalMax, // Dynamic limit from settings
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication routes - uses dynamic max from settings
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => authMax, // Dynamic limit from settings
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Link creation limiter - uses dynamic max from settings
const linkCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => linkCreationMax, // Dynamic limit from settings
  message: 'Too many links created, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Redirect/click limiter - 1000 redirects per 5 minutes (anti-bot protection)
const redirectLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // very high limit to allow normal usage but block obvious bots
  message: 'Too many redirect attempts detected.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  linkCreationLimiter,
  redirectLimiter,
};
