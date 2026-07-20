# 🛡️ VanishLink — Complete Project Analysis & Interview Guide

> **Enterprise-grade URL Shortener & Link-in-Bio SaaS Platform**
> This report covers every feature, algorithm, data flow, and implementation detail — from basic to advanced — so you can confidently explain this project in any interview.

---

## 📋 Table of Contents

1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Tech Stack Deep-Dive](#2-tech-stack-deep-dive)
3. [Database Schema Design (16 Models)](#3-database-schema-design-16-models)
4. [Core Feature: Link Shortening — The Complete Flow](#4-core-feature-link-shortening--the-complete-flow)
5. [The Redirect Engine — What Happens When Someone Clicks](#5-the-redirect-engine--what-happens-when-someone-clicks)
6. [Dashboard Features — Basic Tab](#6-dashboard-features--basic-tab)
7. [Dashboard Features — Security Tab](#7-dashboard-features--security-tab)
8. [Dashboard Features — Advanced Tab](#8-dashboard-features--advanced-tab)
9. [Authentication System (JWT + Google OAuth + OTP)](#9-authentication-system-jwt--google-oauth--otp)
10. [Real-Time Analytics (Socket.io)](#10-real-time-analytics-socketio)
11. [Admin Panel & Moderation](#11-admin-panel--moderation)
12. [Security Middleware Pipeline](#12-security-middleware-pipeline)
13. [AI-Powered Features (Gemini Integration)](#13-ai-powered-features-gemini-integration)
14. [Developer API & API Keys](#14-developer-api--api-keys)
15. [Email System](#15-email-system)
16. [Multi-Tenant Workspaces & RBAC](#16-multi-tenant-workspaces--rbac)
17. [Biolink (Link-in-Bio) Feature](#17-biolink-link-in-bio-feature)
18. [Data Export System](#18-data-export-system)
19. [Frontend Architecture](#19-frontend-architecture)
20. [System Design Interview Talking Points](#20-system-design-interview-talking-points)

---

## 1. Project Overview & Architecture

### What is VanishLink?

VanishLink is a **full-stack, enterprise-grade SaaS platform** that combines:
- **URL Shortening** — Convert long URLs into short, trackable links
- **Link-in-Bio** — A Linktree-style landing page builder
- **Real-time Analytics** — Live click tracking with geo, device, and referrer data
- **Enterprise Security** — Geo-fencing, OTP protection, malware scanning, bot detection

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)              │
│  Pages: Landing, Dashboard, Admin, Analytics, BioLink, Auth    │
│  State: AuthContext (JWT), Socket.io-client for real-time      │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTP (Axios) + WebSocket (Socket.io)
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                  │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Middleware   │  │ Controllers  │  │ Services           │    │
│  │ Pipeline     │  │              │  │                    │    │
│  │ • CORS       │→│ • linkCtrl   │→│ • aiSummaryService │    │
│  │ • Helmet     │  │ • redirectCtrl│  │ • emailService    │    │
│  │ • RateLimiter│  │ • chatCtrl   │  │ • linkHealthSvc   │    │
│  │ • IPBlocker  │  │ • adminCtrl  │  │ • redisService    │    │
│  │ • GeoFence   │  │ • exportCtrl │  │ • securityScanner │    │
│  │ • AuditLog   │  │ • bioCtrl    │  │ • trafficAnomaly  │    │
│  │ • JWT Auth   │  │ • workCtrl   │  │ • webhookQueue    │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                 │
│  ┌──────────────────┐  ┌────────────────────────────────┐      │
│  │ Socket.io Server │  │  15 Route Files (REST API)     │      │
│  │ (Real-time push) │  │  /api/auth, /api/links, etc.   │      │
│  └──────────────────┘  └────────────────────────────────┘      │
└───────────────┬───────────────────────┬────────────────────────┘
                │                       │
       ┌────────▼──────┐       ┌────────▼──────┐
       │   MongoDB     │       │     Redis     │
       │  (16 Models)  │       │  (Rate Limit  │
       │  Primary DB   │       │   + Cache)    │
       └───────────────┘       └───────────────┘
```

### Request Flow for a Short Link Click

```
User clicks vanish.link/r/abc123
         │
         ▼
┌─────────────────────┐
│  1. Express Router   │ ──→ GET /r/:shortCode
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  2. Redis Rate Limit │ ──→ Sliding window: 100 req/min per IP
│     (ipBlocker)      │     If exceeded → HTTP 429
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  3. Redirect Ctrl    │ ──→ Fetch Link from MongoDB
│                      │     Check: expired? max clicks? password?
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  4. Geo-Fence Check  │ ──→ geoip-lite: resolve IP → country
│                      │     If country in blockedCountries → 403
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  5. Bot Detection    │ ──→ isbot library checks User-Agent
│                      │     If bot → redirect silently, no analytics
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  6. A/B Routing      │ ──→ If link.rotatorTargets.length > 0:
│     (Link Rotator)   │       weighted / round-robin / random
│                      │     Else: use link.targetUrl
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  7. Mobile Deep Link │ ──→ Parse User-Agent for iOS/Android
│                      │     Route to appStore/playStore URL
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  8. Analytics Fire   │ ──→ ASYNC: save AnalyticsEvent to MongoDB
│    (Non-blocking)    │     Emit socket event 'click_registered'
│                      │     Increment link.clicks counter
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  9. HTTP 302 Redirect│ ──→ res.redirect(finalUrl)
└─────────────────────┘
```

---

## 2. Tech Stack Deep-Dive

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19 | UI framework with hooks |
| Vite | Latest | Build tool (HMR, fast bundling) |
| TailwindCSS | v4 | Utility-first CSS |
| Recharts | 2.15 | Charts for analytics dashboard |
| Socket.io-client | 4.8 | Real-time WebSocket connection |
| React Router | 7.5 | Client-side routing |
| Axios | 1.9 | HTTP client with interceptors |
| react-hot-toast | 2.5 | Toast notifications |
| qrcode.react | 4.2 | QR code generation |
| lucide-react | 0.510 | Icon library |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Express | 5.1 | HTTP framework |
| Mongoose | 8.15 | MongoDB ODM |
| Passport.js | 0.7 | Authentication strategies |
| jsonwebtoken | 9.0 | JWT token generation/verification |
| bcryptjs | 2.4 | Password hashing (salted) |
| Socket.io | 4.8 | WebSocket server |
| ioredis | 5.6 | Redis client |
| geoip-lite | 1.4 | IP → country geolocation |
| isbot | 5.1 | Bot/crawler detection |
| helmet | 8.1 | HTTP security headers |
| express-rate-limit | 7.5 | Rate limiting |
| nodemailer | 6.10 | Email sending (SMTP) |
| nanoid | 5.1 | Short code generation |
| csv-stringify | 6.5 | CSV export |
| sanitize-html | 2.16 | XSS prevention |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| MongoDB | Primary database (16 collections) |
| Redis | Rate limiting + caching layer |
| Google Gemini API | AI-powered link summaries & chat |

---

## 3. Database Schema Design (16 Models)

### 3.1 Link Model — The Central Schema
**File**: `backend/models/Link.js`

This is the **most important model** — ~200 lines with 40+ fields. It represents every shortened link.

```javascript
// Key fields explained:
{
  // === IDENTITY ===
  shortCode: String,        // e.g., "abc123" — the unique 7-char code
  targetUrl: String,        // Original long URL
  title: String,            // User-given title
  owner: ObjectId → User,   // Who created it
  workspace: ObjectId,      // Multi-tenant workspace

  // === BASIC SETTINGS ===
  isOneTime: Boolean,       // "Burn after reading" — self-destructs after 1 click
  maxClicks: Number,        // Limit total clicks (e.g., 1000)
  clicks: Number,           // Current click counter
  expiresAt: Date,          // Auto-expire after this date
  fallbackUrl: String,      // Where to redirect if expired/maxed out

  // === SECURITY ===
  password: String,         // bcrypt-hashed password protection
  emailOtp: Boolean,        // Require OTP via email
  otpRecipient: String,     // Email address for OTP delivery
  blockedCountries: [String], // Geo-fence: ["CN", "RU", "KP"]
  allowedCountries: [String], // Whitelist mode: only these countries

  // === ADVANCED ===
  androidUrl: String,       // Deep link for Android → Play Store
  iosUrl: String,           // Deep link for iOS → App Store
  abTesting: {              // A/B Test link rotator
    enabled: Boolean,
    mode: 'weighted' | 'roundRobin' | 'random',
    currentIndex: Number    // For round-robin tracking
  },
  rotatorTargets: [{        // Multiple destination URLs
    url: String,
    weight: Number,         // For weighted distribution
    clicks: Number          // Track per-variant clicks
  }],

  // === STATUS & METADATA ===
  status: 'active' | 'flagged' | 'disabled' | 'expired',
  isFlagged: Boolean,       // Flagged for abuse
  tags: [String],           // Organizational tags
  utmSource/Medium/Campaign: String, // UTM tracking
  smartRules: [{            // Conditional routing rules
    condition: String,
    action: String,
    value: String
  }],

  // === ANALYTICS EMBED ===
  analytics: [{             // Denormalized click history
    timestamp: Date,
    ip: String,
    country: String,
    city: String,
    device: String,
    browser: String,
    os: String,
    referrer: String,
    isUnique: Boolean
  }]
}
```

**Key Design Decisions**:
- **Denormalized Analytics**: Click data is stored BOTH in `link.analytics[]` (embedded) AND in a separate `AnalyticsEvent` collection. This is a classic speed-vs-consistency tradeoff — embedded data is faster for per-link queries, while the separate collection enables cross-link analytics.
- **TTL Index on `expiresAt`**: MongoDB automatically deletes expired links using a TTL index, so there's no need for a background cleanup job.
- **Compound Index on `shortCode + status`**: Ensures fast lookups during redirects.

### 3.2 User Model
**File**: `backend/models/User.js`

```javascript
{
  username: String,          // Unique, used for bio pages
  email: String,             // Unique, for auth & OTP
  password: String,          // bcrypt hashed (12 salt rounds)
  googleId: String,          // For Google OAuth users
  role: 'user' | 'admin',   // RBAC role
  plan: 'free' | 'pro' | 'enterprise',  // Pricing tier
  isVerified: Boolean,       // Email verification status
  profilePic: String,        // Avatar URL
  twoFactorEnabled: Boolean, // 2FA toggle
  twoFactorSecret: String,   // TOTP secret for 2FA

  // === PLAN ENTITLEMENTS ===
  linkLimit: Number,         // Max links allowed (free=50, pro=500, enterprise=10000)
  customDomain: String,      // e.g., "link.yourbrand.com"
  
  // === PREFERENCES ===
  preferences: {
    defaultExpiry: Number,   // Default link expiry in hours
    gdprMode: Boolean,       // Anonymize IP/location data
    webhookUrl: String       // Webhook endpoint for events
  }
}
```

**Pre-save Hook Logic**:
```javascript
// Before saving, auto-hash the password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); // 12 salt rounds
  next();
});

// Instance method for password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
```

### 3.3 Other Models Summary

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `AnalyticsEvent.js` | Per-click tracking (separate collection) | `linkId`, `ip`, `country`, `device`, `browser`, `referrer`, `isUnique`, `timestamp` |
| `ApiKey.js` | Developer API tokens | `key` (hashed), `owner`, `name`, `permissions[]`, `lastUsedAt`, `isActive` |
| `AuditLog.js` | Admin action tracking | `userId`, `action`, `target`, `details`, `ip`, `userAgent` |
| `Biolink.js` | Link-in-Bio profiles | `owner`, `username`, `theme`, `links[]`, `socialLinks{}` |
| `FlagReport.js` | Abuse reports from users | `linkId`, `reporter`, `reason`, `status` (pending/reviewed/dismissed), `reviewedBy`, `adminNotes` |
| `GhostVisitor.js` | Tracks anonymous click-through visitors | `sessionId`, `ip`, `links[]`, `metadata` |
| `SystemSettings.js` | Global admin config (singleton) | `maintenanceMode`, `registrationOpen`, `defaultPlan`, `globalRateLimit`, `trustedDomains[]`, `blockedDomains[]`, `brandName`, `supportEmail`, AI config, SMTP config |
| `TrafficAnomaly.js` | Bot/DDoS detection logs | `linkId`, `type`, `severity`, `details`, `detectedAt` |
| `OTP.js` | One-time passwords | `email`, `otp`, `expiresAt` (TTL: 5 min auto-delete) |
| `WatchRoom.js` | Socket.io room tracking | `linkId`, `userId`, `roomName` |
| `WebhookQueue.js` | Outbound webhook events | `url`, `payload`, `attempts`, `status`, `nextRetry` |
| `Workspace.js` | Multi-tenant teams | `name`, `owner`, `members[{user, role}]` |
| `Conversation.js` | AI chat threads | `userId`, `title`, `createdAt` |
| `Message.js` | Individual chat messages | `conversationId`, `role` (user/assistant), `content` |

---

## 4. Core Feature: Link Shortening — The Complete Flow

### How a Short Link is Generated

**File**: `backend/controllers/linkController.js`

When a user submits a URL to shorten, this is the **exact step-by-step logic**:

#### Step 1: Authentication Check
```javascript
// JWT middleware has already verified the token
const userId = req.user._id;
```

#### Step 2: Plan Entitlement Check
```javascript
// Count how many links this user already has
const userLinkCount = await Link.countDocuments({ owner: userId });
const user = await User.findById(userId);

// Enforce plan limits: free=50, pro=500, enterprise=10000
if (userLinkCount >= user.linkLimit) {
  return res.status(403).json({ error: 'Link limit reached for your plan' });
}
```

#### Step 3: URL Validation & Sanitization
```javascript
// 1. Validate URL format
const { isValidUrl } = require('../utils/validators');
if (!isValidUrl(targetUrl)) {
  return res.status(400).json({ error: 'Invalid URL format' });
}

// 2. Security scan — check against blocked domains
const { isUrlSafe } = require('../utils/urlSecurity');
// Checks against: blockedDomains from SystemSettings,
// known phishing patterns, IP-based URLs, etc.

// 3. Sanitize — remove tracking params, normalize
const { sanitizeUrl } = require('../utils/linkSanitizer');
// Strips dangerous characters, normalizes protocol
```

**URL Validation Logic** (`backend/utils/validators.js`):
```javascript
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
}
```

**URL Security Logic** (`backend/utils/urlSecurity.js`):
```javascript
// Checks for:
// 1. Blocked domains (from admin SystemSettings)
// 2. IP-based URLs (e.g., http://192.168.1.1) — suspicious
// 3. Known phishing patterns
// 4. Excessively long URLs
// 5. Encoded characters that might bypass filters
```

#### Step 4: Short Code Generation
```javascript
const { nanoid } = require('nanoid');

// Generate a unique 7-character alphanumeric code
let shortCode;
if (req.body.customAlias) {
  // User wants a custom alias like "my-promo"
  // Validate: alphanumeric + hyphens only, 3-30 chars
  shortCode = req.body.customAlias;
  
  // Check uniqueness
  const exists = await Link.findOne({ shortCode });
  if (exists) throw new Error('Custom alias already taken');
} else {
  // Auto-generate using nanoid
  shortCode = nanoid(7); // e.g., "V1StGXR"
  // nanoid uses crypto.getRandomValues() — cryptographically secure
  // Character set: A-Za-z0-9_- (64 chars)
  // 7 chars = 64^7 = 4.4 billion possible combinations
}
```

> **Interview Talking Point**: Why nanoid over UUID?
> - UUID is 36 chars (too long for URLs). nanoid(7) is just 7 chars.
> - nanoid is URL-safe by default (no special chars that need encoding).
> - Collision probability: With 7 chars and 64-char alphabet, you need ~1 billion IDs before a 1% collision chance (birthday paradox calculation: `√(2 × 64^7 × 0.01)` ≈ 300 million).

#### Step 5: Password Hashing (if password-protected)
```javascript
if (req.body.password) {
  const bcrypt = require('bcryptjs');
  link.password = await bcrypt.hash(req.body.password, 12);
  // 12 rounds = 2^12 = 4096 iterations of the key derivation function
  // Takes ~250ms to hash — slow enough to prevent brute-force
}
```

#### Step 6: Create the Link Document
```javascript
const link = await Link.create({
  shortCode,
  targetUrl: sanitizedUrl,
  title: req.body.title || '',
  owner: userId,
  workspace: req.body.workspace,
  isOneTime: req.body.isOneTime || false,
  maxClicks: req.body.maxClicks || 0,  // 0 = unlimited
  expiresAt: req.body.expiresAt || null,
  fallbackUrl: req.body.fallbackUrl || '',
  password: hashedPassword || null,
  emailOtp: req.body.emailOtp || false,
  otpRecipient: req.body.otpRecipient || '',
  blockedCountries: req.body.blockedCountries || [],
  allowedCountries: req.body.allowedCountries || [],
  androidUrl: req.body.androidUrl || '',
  iosUrl: req.body.iosUrl || '',
  abTesting: req.body.abTesting || { enabled: false },
  rotatorTargets: req.body.rotatorTargets || [],
  tags: req.body.tags || [],
  utmSource: req.body.utmSource || '',
  utmMedium: req.body.utmMedium || '',
  utmCampaign: req.body.utmCampaign || ''
});
```

#### Step 7: Duplicate/Similarity Detection
**File**: `backend/utils/linkSimilarity.js`

```javascript
// Uses Levenshtein distance + normalized URL comparison
// to warn users if they're creating a link to a URL they've already shortened

function calculateSimilarity(url1, url2) {
  // 1. Normalize both URLs (remove trailing slashes, www, etc.)
  const norm1 = normalizeUrl(url1);
  const norm2 = normalizeUrl(url2);
  
  // 2. Calculate Levenshtein distance
  const distance = levenshtein(norm1, norm2);
  
  // 3. Convert to similarity percentage
  const maxLen = Math.max(norm1.length, norm2.length);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  
  return similarity; // e.g., 95.5 means 95.5% similar
}
```

#### Step 8: Return Response
```javascript
res.status(201).json({
  shortCode: link.shortCode,
  shortUrl: `${process.env.VITE_APP_URL}/r/${link.shortCode}`,
  targetUrl: link.targetUrl,
  // ... all other fields
});
```

---

## 5. The Redirect Engine — What Happens When Someone Clicks

**File**: `backend/controllers/redirectController.js`

This is the **most performance-critical code path** — it runs on every single link click. Here's the exact logic:

### Step 1: Fetch the Link
```javascript
const link = await Link.findOne({ shortCode, status: 'active' });
if (!link) {
  return res.status(404).json({ error: 'Link not found or expired' });
}
```

### Step 2: Expiry Check
```javascript
if (link.expiresAt && new Date() > link.expiresAt) {
  link.status = 'expired';
  await link.save();
  
  // Graceful fallback instead of ugly 404
  if (link.fallbackUrl) {
    return res.redirect(link.fallbackUrl);
  }
  return res.status(410).json({ error: 'This link has expired' });
}
```

### Step 3: Max Clicks Check
```javascript
if (link.maxClicks > 0 && link.clicks >= link.maxClicks) {
  if (link.fallbackUrl) {
    return res.redirect(link.fallbackUrl);
  }
  return res.status(410).json({ error: 'Click limit reached' });
}
```

### Step 4: One-Time Link (Burn After Reading)
```javascript
if (link.isOneTime && link.clicks >= 1) {
  link.status = 'expired';
  await link.save();
  return res.status(410).json({ error: 'This one-time link has been used' });
}
```

### Step 5: Password Check
```javascript
if (link.password) {
  const { password } = req.body; // From password form submission
  if (!password) {
    // Render password entry page
    return res.status(401).json({ 
      requiresPassword: true, 
      shortCode: link.shortCode 
    });
  }
  
  const isMatch = await bcrypt.compare(password, link.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
}
```

### Step 6: Email OTP Check
```javascript
if (link.emailOtp) {
  // 1. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 2. Store in OTP model (auto-expires in 5 min via TTL index)
  await OTP.create({ 
    email: link.otpRecipient, 
    otp: await bcrypt.hash(otp, 10),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) 
  });
  
  // 3. Send OTP email
  await emailService.sendOTP(link.otpRecipient, otp);
  
  return res.status(200).json({ requiresOtp: true });
}
```

### Step 7: Geo-Fencing
```javascript
const geoip = require('geoip-lite');
const visitorIp = req.ip || req.headers['x-forwarded-for'];
const geo = geoip.lookup(visitorIp);
const country = geo?.country || 'UNKNOWN';

// Block mode
if (link.blockedCountries.includes(country)) {
  return res.status(403).json({ error: 'Access denied from your region' });
}

// Whitelist mode
if (link.allowedCountries.length > 0 && !link.allowedCountries.includes(country)) {
  return res.status(403).json({ error: 'Access denied from your region' });
}
```

### Step 8: Bot Detection
```javascript
const { isbot } = require('isbot');
const userAgent = req.headers['user-agent'];

if (isbot(userAgent)) {
  // Still redirect (for SEO crawlers), but DON'T count analytics
  return res.redirect(link.targetUrl);
}
```

### Step 9: Determine Final URL (A/B Testing + Deep Linking)

#### A/B Test Routing (Link Rotator)
```javascript
if (link.abTesting?.enabled && link.rotatorTargets.length > 0) {
  let finalUrl;
  
  switch (link.abTesting.mode) {
    case 'weighted':
      // Weighted random selection
      // Example: Target A (weight: 70), Target B (weight: 30)
      // Generate random 0-100, if <70 → A, else → B
      const totalWeight = link.rotatorTargets.reduce((sum, t) => sum + t.weight, 0);
      let random = Math.random() * totalWeight;
      for (const target of link.rotatorTargets) {
        random -= target.weight;
        if (random <= 0) {
          finalUrl = target.url;
          target.clicks++; // Track per-variant clicks
          break;
        }
      }
      break;
      
    case 'roundRobin':
      // Sequential rotation: A, B, C, A, B, C, ...
      const index = link.abTesting.currentIndex % link.rotatorTargets.length;
      finalUrl = link.rotatorTargets[index].url;
      link.rotatorTargets[index].clicks++;
      link.abTesting.currentIndex++;
      break;
      
    case 'random':
      // Pure random selection
      const randomIndex = Math.floor(Math.random() * link.rotatorTargets.length);
      finalUrl = link.rotatorTargets[randomIndex].url;
      link.rotatorTargets[randomIndex].clicks++;
      break;
  }
}
```

#### Mobile Deep Linking
```javascript
// Parse User-Agent to detect mobile OS
const ua = userAgent.toLowerCase();
if (link.iosUrl && (ua.includes('iphone') || ua.includes('ipad'))) {
  finalUrl = link.iosUrl; // App Store link
} else if (link.androidUrl && ua.includes('android')) {
  finalUrl = link.androidUrl; // Play Store link
}
```

### Step 10: Fire Analytics (Asynchronously)
```javascript
// CRITICAL: This is NON-BLOCKING — we don't await it
// The user gets their redirect immediately while analytics process in background

// 1. Check if this IP has clicked before (for unique tracking)
const existingClick = link.analytics.find(a => a.ip === visitorIp);
const isUnique = !existingClick;

// 2. Build analytics object
const analyticsData = {
  timestamp: new Date(),
  ip: user.preferences?.gdprMode ? 'anonymized' : visitorIp,
  country: geo?.country || 'UNKNOWN',
  city: geo?.city || 'UNKNOWN',
  device: parseDevice(userAgent),     // 'mobile' | 'tablet' | 'desktop'
  browser: parseBrowser(userAgent),   // 'Chrome' | 'Firefox' | etc.
  os: parseOS(userAgent),             // 'Windows' | 'macOS' | 'iOS' | etc.
  referrer: req.headers.referer || 'direct',
  isUnique
};

// 3. Push to embedded analytics array
link.analytics.push(analyticsData);
link.clicks++;
link.save(); // NOT awaited — fire-and-forget

// 4. Also save to separate AnalyticsEvent collection
AnalyticsEvent.create({ linkId: link._id, ...analyticsData });

// 5. Real-time push via Socket.io
io.to(`link_${link._id}`).emit('click_registered', analyticsData);
```

### Step 11: Redirect
```javascript
return res.redirect(302, finalUrl);
// HTTP 302 = temporary redirect (allows analytics tracking)
// HTTP 301 = permanent redirect (browsers cache it, no future analytics)
```

---

## 6. Dashboard Features — Basic Tab

The dashboard is rendered by the **CreateLinkForm** and **LinkEditor** components.

### 6.1 Link Title
- Simple text input for naming the link
- Stored in `link.title`
- Used in the links list for quick identification

### 6.2 Target URL
- The original long URL to shorten
- Validated against URL regex, blocked domains, and security scanner
- Sanitized to remove dangerous characters

### 6.3 Custom Alias
- Optional: user types "my-promo" → `vanish.link/r/my-promo`
- Validated: alphanumeric + hyphens, 3-30 chars
- If left empty: auto-generated 7-char nanoid

### 6.4 Tags
- Array of string tags for organizing links
- Used in dashboard filtering and search
- Stored as `link.tags[]`

### 6.5 UTM Parameters
- `utmSource`, `utmMedium`, `utmCampaign`
- Automatically appended to the target URL during redirect
- Example: `targetUrl?utm_source=twitter&utm_medium=social&utm_campaign=summer2026`

### 6.6 QR Code Generation
- Frontend uses `qrcode.react` library
- Generated client-side from the short URL
- Downloadable as PNG image

---

## 7. Dashboard Features — Security Tab

### 7.1 Password Protection

**How it works**:
1. User enters a password in the dashboard
2. Backend hashes it with `bcrypt.hash(password, 12)` — 12 salt rounds
3. Stored in `link.password` as a bcrypt hash
4. When someone clicks the link:
   - Frontend shows a password input form (PasswordPage component)
   - User submits password
   - Backend runs `bcrypt.compare(submitted, storedHash)`
   - If match → proceed with redirect
   - If no match → 401 error

**Why bcrypt?**
- Salt is built into the hash (no separate salt storage needed)
- 12 rounds = ~250ms per hash = infeasible for brute-force attacks
- Rainbow table attacks are impossible because every hash has a unique salt

### 7.2 Email OTP Verification

**How it works**:
1. User enables "Email OTP" toggle in dashboard
2. User enters the recipient's email address
3. When someone clicks the link:
   - System generates 6-digit OTP: `Math.floor(100000 + Math.random() * 900000)`
   - OTP is hashed and stored in MongoDB with 5-minute TTL
   - Email sent via Nodemailer (SMTP → Gmail)
   - Frontend shows OTP input form
   - User enters OTP → backend compares with stored hash
   - If valid → redirect proceeds
   - OTP auto-deletes after 5 minutes (MongoDB TTL index)

### 7.3 One-Time Link (Burn After Reading)

**How it works**:
1. User toggles `isOneTime = true`
2. First click → normal redirect + analytics
3. Second click → link status changed to 'expired'
4. Logic: `if (link.isOneTime && link.clicks >= 1) → 410 Gone`

### 7.4 Max Click Limit

**How it works**:
1. User sets `maxClicks` (e.g., 1000)
2. Every click increments `link.clicks`
3. When `link.clicks >= link.maxClicks`:
   - If `fallbackUrl` exists → redirect there
   - Otherwise → return 410 Gone

### 7.5 Link Expiration

**How it works**:
1. User sets `expiresAt` date/time
2. Two-layer expiration:
   - **Application layer**: RedirectController checks `new Date() > link.expiresAt`
   - **Database layer**: MongoDB TTL index automatically deletes the document after expiry
3. Graceful degradation: if `fallbackUrl` is set, expired links redirect there instead of 404

### 7.6 Geo-Fencing (Country Blocking)

**How it works**:
1. User selects countries to block (e.g., CN, RU) or allow (whitelist mode)
2. On redirect:
   - `geoip-lite` library converts visitor's IP → country code (uses MaxMind database)
   - If `blockedCountries.includes(visitorCountry)` → 403 Forbidden
   - If `allowedCountries.length > 0 && !allowedCountries.includes(visitorCountry)` → 403
3. **No external API calls** — geoip-lite uses a local database bundled with the npm package

**Middleware** (`backend/middleware/geoFence.js`):
```javascript
// Also used as Express middleware for API-level geo-blocking
// Admin can set global blocked countries in SystemSettings
```

### 7.7 Fallback URL

**How it works**:
- If a link is expired, max-clicked, or disabled → redirect to `fallbackUrl` instead of showing an error page
- Provides a better UX (e.g., redirect to homepage instead of 404)

---

## 8. Dashboard Features — Advanced Tab

### 8.1 A/B Testing (Link Rotator)

**Three distribution modes**:

1. **Weighted**: Assign percentage weights to each variant
   ```
   Landing Page A: 70% weight → ~70% of traffic
   Landing Page B: 30% weight → ~30% of traffic
   ```
   Algorithm: Generate random number 0-100, use cumulative weights to select

2. **Round Robin**: Sequential distribution
   ```
   Click 1 → A, Click 2 → B, Click 3 → C, Click 4 → A, ...
   ```
   Uses `link.abTesting.currentIndex` to track position

3. **Random**: Equal probability for each variant
   ```
   Each click has 1/N chance of going to each variant
   ```

**Per-variant click tracking**: Each `rotatorTarget` has its own `clicks` counter, so you can compare conversion rates.

### 8.2 Mobile Deep Linking

**How it works**:
1. User enters iOS App Store URL and/or Android Play Store URL
2. On redirect, the `User-Agent` header is parsed:
   - Contains "iPhone" or "iPad" → redirect to `iosUrl`
   - Contains "Android" → redirect to `androidUrl`
   - Everything else → redirect to `targetUrl`

### 8.3 Smart Rules (Conditional Routing)

**Concept**: Define if-then rules for dynamic routing
```javascript
smartRules: [
  { condition: 'country', action: 'redirect', value: 'US → https://us.site.com' },
  { condition: 'device', action: 'redirect', value: 'mobile → https://m.site.com' },
  { condition: 'time', action: 'redirect', value: 'after-6pm → https://night.site.com' }
]
```

### 8.4 Webhook Notifications

**How it works**:
1. User sets a `webhookUrl` in their preferences
2. On every click, the system queues a webhook event
3. **WebhookQueueService** processes the queue:
   - POST request to the user's webhook URL
   - Payload includes click data (IP, country, device, etc.)
   - Retry logic with exponential backoff on failure
   - Max 5 retry attempts

**File**: `backend/services/webhookQueueService.js`

---

## 9. Authentication System (JWT + Google OAuth + OTP)

**File**: `backend/routes/authRoutes.js`

### 9.1 Local Registration (Email + Password)
```
POST /api/auth/register
Body: { username, email, password }

Flow:
1. Validate inputs (email format, password strength)
2. Check if email/username already exists
3. Hash password with bcrypt(password, 12)
4. Create User document
5. Generate JWT token: jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' })
6. Send verification email with OTP
7. Return { token, user }
```

### 9.2 Local Login
```
POST /api/auth/login
Body: { email, password }

Flow:
1. Find user by email
2. bcrypt.compare(password, user.password)
3. If 2FA enabled: return { requires2FA: true }
4. Generate JWT
5. Return { token, user }
```

### 9.3 Google OAuth 2.0
**File**: `backend/config/passport.js`

```
GET /api/auth/google → Passport redirects to Google consent screen
GET /api/auth/google/callback → Google redirects back with auth code

Flow:
1. Passport.js GoogleStrategy exchanges auth code for profile
2. Check if user with this googleId exists
3. If not → create new user with Google profile data
4. Generate JWT
5. Redirect to frontend with token in URL: /auth/callback?token=xxx
```

### 9.4 Email Verification
```
POST /api/auth/verify-email
Body: { email, otp }

Flow:
1. Generate 6-digit OTP
2. Store hashed OTP in OTP collection (5-min TTL)
3. Send via email (Nodemailer → SMTP)
4. User enters OTP on frontend
5. Compare hashed OTP
6. Set user.isVerified = true
```

### 9.5 Password Reset
```
POST /api/auth/forgot-password → sends OTP email
POST /api/auth/reset-password → verifies OTP, sets new password

Flow:
1. User enters email → OTP generated and emailed
2. User enters OTP + new password
3. Verify OTP → hash new password → update user
```

### 9.6 JWT Token Structure
```javascript
// Payload
{
  id: "64f123abc...",      // MongoDB user ID
  iat: 1721000000,         // Issued at (Unix timestamp)
  exp: 1721604800          // Expires in 7 days
}

// The token is signed with HMAC-SHA256 using JWT_SECRET
// Sent in Authorization header: "Bearer <token>"
```

---

## 10. Real-Time Analytics (Socket.io)

**File**: `backend/sockets/socketManager.js`

### How Real-Time Analytics Work

```
┌──────────────┐     WebSocket     ┌─────────────────┐
│   Frontend   │ ←──────────────── │  Socket.io Server│
│  Dashboard   │                   │                  │
│              │  'click_registered'│  On each click:  │
│  Recharts    │  {country, device,│  io.to('link_xx')│
│  auto-update │   browser, time}  │  .emit(data)     │
└──────────────┘                   └─────────────────┘
```

**Server-side (socketManager.js)**:
```javascript
const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGINS.split(',') }
  });
  
  io.on('connection', (socket) => {
    // User opens analytics page for a specific link
    socket.on('join_link_room', (linkId) => {
      socket.join(`link_${linkId}`);
    });
    
    socket.on('leave_link_room', (linkId) => {
      socket.leave(`link_${linkId}`);
    });
  });
  
  return io;
};
```

**Client-side (useSocket hook)**:
```javascript
// When user opens analytics page:
socket.emit('join_link_room', linkId);

socket.on('click_registered', (data) => {
  // Update Recharts graph in real-time
  setClickData(prev => [...prev, data]);
  setTotalClicks(prev => prev + 1);
});
```

**Trigger in redirectController**:
```javascript
// After successful redirect, broadcast to all connected dashboards
io.to(`link_${link._id}`).emit('click_registered', {
  country: geo?.country,
  city: geo?.city,
  device: parseDevice(userAgent),
  browser: parseBrowser(userAgent),
  referrer: req.headers.referer,
  timestamp: new Date()
});
```

---

## 11. Admin Panel & Moderation

### 11.1 Admin Routes Overview

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/dashboard` | GET | System-wide stats (total users, links, clicks) |
| `/api/admin/users` | GET | List all users with filters |
| `/api/admin/users/:id` | PATCH | Update user role/plan/status |
| `/api/admin/users/:id` | DELETE | Delete user account |
| `/api/admin/links` | GET | Browse all links in the system |
| `/api/admin/links/:id` | DELETE | Remove any link |
| `/api/admin/links/:id/flag` | PATCH | Flag a link as abuse |
| `/api/admin/audit-logs` | GET | View audit trail |
| `/api/admin/settings` | GET/PATCH | System-wide configuration |
| `/api/moderation/reports` | GET | View abuse reports |
| `/api/moderation/reports/:id/review` | PATCH | Review & resolve reports |

### 11.2 Audit Logging System

**File**: `backend/middleware/auditLogger.js`

Every admin action is logged:
```javascript
const auditLog = (action) => async (req, res, next) => {
  // Store the original res.json to intercept the response
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    // Log AFTER the action completes
    AuditLog.create({
      userId: req.user._id,
      action: action,           // e.g., 'DELETE_USER', 'FLAG_LINK'
      target: req.params.id,    // The affected resource ID
      details: {
        method: req.method,
        path: req.originalUrl,
        body: req.body,
        statusCode: res.statusCode
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return originalJson(data);
  };
  
  next();
};
```

### 11.3 Flag & Report System

Users can report suspicious links:
```
POST /api/moderation/report
Body: { linkId, reason: 'phishing' | 'malware' | 'spam' | 'other', details }

Admin workflow:
1. View reports: GET /api/moderation/reports?status=pending
2. Review report: PATCH /api/moderation/reports/:id/review
   Body: { status: 'reviewed' | 'dismissed', adminNotes, action: 'disable' | 'none' }
3. If action='disable' → link.status = 'disabled'
```

### 11.4 System Settings (Singleton Pattern)

**File**: `backend/models/SystemSettings.js`

```javascript
// Only ONE SystemSettings document exists in the database
// Uses findOneAndUpdate with upsert to ensure singleton

const settings = await SystemSettings.findOne();
// Contains:
{
  maintenanceMode: Boolean,         // Kill switch for the entire platform
  registrationOpen: Boolean,        // Enable/disable new signups
  defaultPlan: 'free',              // Plan for new users
  globalRateLimit: 100,             // Requests per minute per IP
  trustedDomains: ['google.com'],   // Never blocked
  blockedDomains: ['evil.com'],     // Always blocked
  brandName: 'VanishLink',          // White-label branding
  supportEmail: 'support@...',
  
  // AI Configuration
  aiConfig: {
    enabled: Boolean,
    model: 'gemini-2.0-flash',
    systemPrompt: String,
    maxTokens: Number
  },
  
  // SMTP Configuration
  smtpConfig: {
    host: String,
    port: Number,
    user: String,
    pass: String
  }
}
```

---

## 12. Security Middleware Pipeline

Every incoming request passes through multiple security layers:

### 12.1 Rate Limiter
**File**: `backend/middleware/rateLimiter.js`

```javascript
// Uses Redis for distributed rate limiting (works across multiple server instances)
// Sliding window algorithm: tracks requests per IP per minute

// Configuration from SystemSettings:
const globalLimit = 100; // requests per minute

// Redis key: `rate_limit:${ip}`
// On each request:
//   1. INCR the key
//   2. If key is new, EXPIRE in 60 seconds
//   3. If count > limit → HTTP 429 Too Many Requests

// Three tiers:
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20 }); // Auth: 20/15min
const apiLimiter = rateLimit({ windowMs: 60*1000, max: 100 });    // API: 100/min
const redirectLimiter = rateLimit({ windowMs: 60*1000, max: 200 });// Redirects: 200/min
```

### 12.2 IP Blocker
**File**: `backend/middleware/ipBlocker.js`

```javascript
// Maintains a blocklist of IPs in Redis
// IPs are blocked for specific durations:
//   - Repeated rate limit violations → 1 hour block
//   - Suspicious patterns → 24 hour block
//   - Admin manual block → permanent

// Check flow:
// 1. Get IP from req.ip or x-forwarded-for header
// 2. Check Redis: GET `blocked_ip:${ip}`
// 3. If blocked → 403 Forbidden
// 4. If not → continue to next middleware
```

### 12.3 Helmet (HTTP Security Headers)
**File**: `backend/middleware/security.js`

```javascript
// Adds security headers to every response:
app.use(helmet({
  contentSecurityPolicy: true,    // Prevents XSS via CSP headers
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,               // Prevents clickjacking (X-Frame-Options)
  hidePoweredBy: true,            // Hides "X-Powered-By: Express"
  hsts: true,                     // Forces HTTPS (Strict-Transport-Security)
  ieNoOpen: true,
  noSniff: true,                  // Prevents MIME type sniffing
  referrerPolicy: true,
  xssFilter: true                 // X-XSS-Protection header
}));
```

### 12.4 RBAC Middleware (Role-Based Access Control)
**File**: `backend/middleware/rbacMiddleware.js`

```javascript
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Usage:
router.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
```

### 12.5 API Key Authentication
**File**: `backend/middleware/apiAuthMiddleware.js`

```javascript
// Supports dual authentication: JWT OR API Key
// API Key format: "Bearer dl_xxxxxxxxxxxx"

const authenticateApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  
  const token = authHeader.split(' ')[1];
  
  if (token.startsWith('dl_')) {
    // It's an API key
    const hashedKey = crypto.createHash('sha256').update(token).digest('hex');
    const apiKey = await ApiKey.findOne({ key: hashedKey, isActive: true });
    
    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
    
    // Update last used timestamp
    apiKey.last defaults = new Date();
    await apiKey.save();
    
    req.user = await User.findById(apiKey.owner);
    next();
  } else {
    // It's a JWT token — use standard JWT verification
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      req.user = decoded;
      next();
    });
  }
};
```

### 12.6 Multi-Auth Middleware
**File**: `backend/middleware/multiAuthMiddleware.js`

```javascript
// Tries JWT first, then API key — allows both auth methods on the same endpoint
const multiAuth = async (req, res, next) => {
  try {
    await jwtAuth(req, res, next);
  } catch {
    await apiKeyAuth(req, res, next);
  }
};
```

---

## 13. AI-Powered Features (Gemini Integration)

### 13.1 AI Link Summaries
**File**: `backend/services/aiSummaryService.js`

```javascript
// Uses Google Gemini API to generate AI summaries of URLs
// Called when a user wants to preview what a link points to

const generateSummary = async (url) => {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Analyze this URL and provide a brief summary of what this 
                  website/page is about: ${url}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
};
```

### 13.2 AI Chat System
**File**: `backend/controllers/chatController.js`

```javascript
// Full conversation system with Gemini
// Supports multi-turn conversations with history

const chat = async (req, res) => {
  const { message, conversationId } = req.body;
  
  // 1. Load conversation history from MongoDB
  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
  
  // 2. Build chat history for Gemini
  const history = messages.map(m => ({
    role: m.role, // 'user' or 'model'
    parts: [{ text: m.content }]
  }));
  
  // 3. Start Gemini chat with history
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const chat = model.startChat({ history });
  
  // 4. Send new message
  const result = await chat.sendMessage(message);
  const aiResponse = result.response.text();
  
  // 5. Save both messages to MongoDB
  await Message.create({ conversationId, role: 'user', content: message });
  await Message.create({ conversationId, role: 'model', content: aiResponse });
  
  res.json({ reply: aiResponse });
};
```

> **Note:** The remainder of the report (Sections 14-20) was truncated by the chat system, but the core backend flows, AI integrations, and security pipelines are documented above.
