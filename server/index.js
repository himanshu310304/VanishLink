// server/index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const https = require('https'); // for webhook requests
const { Server } = require('socket.io');
require('dotenv').config();

const watchRoutes = require('./routes/watchRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const Link = require('./models/Link');
const AnalyticsEvent = require('./models/AnalyticsEvent');
const adminRoutes = require('./routes/adminRoutes');
const adminLinkRoutes = require('./routes/adminLinkRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const { router: authRoutes, authenticate } = require('./routes/authRoutes');

// Rate limiting and security middleware
const { generalLimiter, authLimiter, linkCreationLimiter, redirectLimiter } = require('./middleware/rateLimiter');
const { ipBlocker } = require('./middleware/ipBlocker');
const settingsRoutes = require('./routes/settingsRoutes');
const adminAuditRoutes = require('./routes/adminAuditRoutes');
const securityRoutes = require('./routes/securityRoutes');
const { basicUrlSafetyCheck } = require('./scripts/urlSafety');
const linkRoutes = require('./routes/linkRoutes');

// 🔐 Trusted Recipient & Device-Bound Secure Sharing
const invitationsRoutes = require('./routes/invitations');
const zeroTrustRoutes = require('./routes/zeroTrustRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const { detectDirectAccessAttempt } = require('./middleware/leakDetector');

const app = express();
const PORT = process.env.PORT || 5050;

const passport = require('passport');
require('./config/passport');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(passport.initialize());

// Apply IP blocking globally (first line of defense)
app.use(ipBlocker);

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// ---- Auth routes with stricter rate limiting ----
app.use('/api/auth', authLimiter, authRoutes);

// ---- MongoDB connection ----
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_link';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// ---------------- REST ROUTES ---------------- //

// health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// watch party REST routes (protected)
app.use('/api/watch', authenticate, watchRoutes);

// analytics REST routes (REAL data) - protected
app.use('/api/analytics', authenticate, analyticsRoutes);

// Admin middleware - must be logged in AND be admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// admin link management routes (more specific -> mount first)
app.use('/api/admin/links', authenticate, requireAdmin, adminLinkRoutes);

// other admin routes
app.use('/api/admin', authenticate, requireAdmin, adminRoutes);

// admin user access controls
app.use('/api/admin/users', authenticate, requireAdmin, adminUserRoutes);

// moderation routes (reports can be public, review is admin-only)
app.use('/api/moderation', moderationRoutes);
// system settings
app.use('/api/settings', settingsRoutes);

// admin audit-log routes
app.use('/api/admin/audit-logs', adminAuditRoutes);

// security / URL scan API
app.use('/api/security', securityRoutes);

// similarity / helper link routes
app.use('/api/links', linkRoutes);

// 🔐 Secure Sharing Routes
app.use('/api/invitations', invitationsRoutes); // Old fallback
app.use('/api/zero-trust', zeroTrustRoutes);
app.use('/api/links/:linkId/invitations', invitationRoutes);

// ---------------- LINK CRUD ---------------- //

// GET /api/links/public - fetch all public/active links (for community browsing)
app.get('/api/links/public', authenticate, async (req, res) => {
  try {
    const links = await Link.find({})
      .sort({ createdAt: -1 })
      .limit(500) // Limit to prevent overwhelming the client
      .select('_id slug targetUrl title clicks createdAt ownerEmail password showPreview isOneTime maxClicks collection status');

    console.log(`📊 Fetched ${links.length} public links`);
    res.json(links);
  } catch (err) {
    console.error('Error fetching public links:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/links - list links created by authenticated user only (protected)
app.get('/api/links', authenticate, async (req, res) => {
  try {
    // Filter by user's email - simple and works with existing data
    const query = { ownerEmail: req.user.email };

    const links = await Link.find(query).sort({ createdAt: -1 });
    res.json(links);
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/links/:slug - fetch a single link with rule checks
app.get('/api/links/:slug', detectDirectAccessAttempt, async (req, res) => {
  try {
    const { slug } = req.params;

    const link = await Link.findOne({ slug });
    if (!link) {
      return res.status(404).json({ status: 'not_found' });
    }

    if (link.isRecipientBound) {
      return res.status(403).json({
        status: 'blocked',
        reason: 'This secure link requires a valid invitation token.',
      });
    }

    const now = new Date();

    // EXPIRY CHECK
    if (link.expiresAt && now > link.expiresAt) {
      const wasExpired = link.status === 'expired';
      if (!wasExpired) {
        link.status = 'expired';
        await link.save();

        sendWebhook(link, 'expired', {
          reason: 'time_expired',
          source: 'status_check',
        });
      }
      return res.status(200).json({
        status: 'expired',
        reason: 'Link has self-destructed.',
      });
    }

    // CLICK LIMIT CHECK
    const effectiveLimit = link.isOneTime ? 1 : link.maxClicks || 0;
    if (effectiveLimit > 0 && link.clicks >= effectiveLimit) {
      const wasExpired = link.status === 'expired';
      if (!wasExpired) {
        link.status = 'expired';
        await link.save();

        sendWebhook(link, 'expired', {
          reason: 'max_clicks_status_check',
          source: 'status_check',
        });
      }
      return res.status(200).json({
        status: 'expired',
        reason: 'Link has reached its maximum allowed clicks.',
      });
    }

    // Scheduled activation
    if (link.scheduleStart && now < link.scheduleStart) {
      return res.status(200).json({
        status: 'scheduled',
        reason: 'Link is not active yet.',
        startsAt: link.scheduleStart,
      });
    }

    return res.status(200).json({
      status: 'active',
      link,
    });
  } catch (err) {
    console.error('Error in GET /api/links/:slug:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const { requireZeroTrust } = require('./middleware/zeroTrustAuth');

// POST /api/links - create a new short link (protected + rate limited)
app.post('/api/links', authenticate, linkCreationLimiter, async (req, res) => {
  try {
    console.log('POST /api/links body:', req.body); // 🔍 debug

    const {
      url,
      targetUrl,
      slug,
      title,
      password,
      isOneTime,
      maxClicks,
      expiresAt,
      showPreview,
      collection,
      scheduleStart,
      creatorName,
      ownerEmail,
      conditionalRedirect,
      webhookConfig,
      visibility,
      isRecipientBound,
      allowedVerificationMethods,
    } = req.body || {};

    // accept either `url` or `targetUrl`
    const finalUrl = (url || targetUrl || '').trim();

    if (!finalUrl) {
      return res
        .status(400)
        .json({ message: 'destination url is required' }); // 🔴 new text
    }
    const finalVisibility =
      visibility === 'private' ? 'private' : 'public';


    // 🧠 run heuristic safety scan for this URL
    const safety = basicUrlSafetyCheck(finalUrl);

    // slug handling
    let finalSlug;
    if (slug && slug.trim()) {
      const normalizedSlug = slug.trim();
      const alreadyExists = await Link.findOne({ slug: normalizedSlug });
      if (alreadyExists) {
        return res.status(409).json({ message: 'Slug already taken' });
      }
      finalSlug = normalizedSlug;
    } else {
      finalSlug = Math.random().toString(36).substring(2, 8);
      let exists = await Link.findOne({ slug: finalSlug });
      while (exists) {
        finalSlug = Math.random().toString(36).substring(2, 8);
        exists = await Link.findOne({ slug: finalSlug });
      }
    }

    const now = new Date();

    const newLink = await Link.create({
      title: title || finalUrl,
      slug: finalSlug,
      targetUrl: finalUrl,
      clicks: 0,
      status: 'active',
      createdAt: now,

      password: password || null,
      isOneTime: !!isOneTime,
      maxClicks: maxClicks || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      showPreview: !!showPreview,
      collection: collection || 'General',
      scheduleStart: scheduleStart ? new Date(scheduleStart) : null,
      creatorName: creatorName || 'Anonymous',
      ownerEmail: ownerEmail || null,
      isFavorite: false,

      visibility: finalVisibility,
      
      // Zero-Trust configs
      isRecipientBound: !!isRecipientBound,
      allowedVerificationMethods: Array.isArray(allowedVerificationMethods) 
        ? allowedVerificationMethods 
        : (isRecipientBound ? ['email_otp'] : []),

      conditionalRedirect: conditionalRedirect || undefined,
      webhookConfig: webhookConfig || undefined,

      // 🧠 store safety result
      safetyScore: safety.score,
      safetyVerdict: safety.verdict,
      isFlagged: safety.flagRecommended,
      flagReason: safety.flagRecommended
        ? 'auto_flag_safety_scanner'
        : null,
      flaggedAt: safety.flagRecommended ? now : null,
      moderationStatus: safety.flagRecommended ? 'flagged' : 'clean',
    });

    return res.status(201).json(newLink);
  } catch (err) {
    console.error('Error in POST /api/links:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/links/:id - update link details (protected)
app.put('/api/links/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      targetUrl,
      password,
      isOneTime,
      maxClicks,
      expiresAt,
      showPreview,
      collection,
      creatorName,
      scheduleStart,
      conditionalRedirect,
      webhookConfig,
      visibility,
      isRecipientBound,
      allowedVerificationMethods,
    } = req.body || {};

    const link = await Link.findById(id);
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Check ownership by email
    if (link.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'You do not have permission to edit this link' });
    }

    // Update allowed fields
    if (title !== undefined) link.title = title;
    if (targetUrl !== undefined) link.targetUrl = targetUrl;
    if (password !== undefined) link.password = password || null;
    if (isOneTime !== undefined) link.isOneTime = !!isOneTime;
    if (maxClicks !== undefined) link.maxClicks = maxClicks;
    if (expiresAt !== undefined)
      link.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (showPreview !== undefined) link.showPreview = !!showPreview;
    if (collection !== undefined) link.collection = collection;
    if (creatorName !== undefined) link.creatorName = creatorName;
    if (scheduleStart !== undefined)
      link.scheduleStart = scheduleStart ? new Date(scheduleStart) : null;

    if (conditionalRedirect !== undefined) {
      link.conditionalRedirect = conditionalRedirect;
    }
    if (webhookConfig !== undefined) {
      link.webhookConfig = webhookConfig;
    }
    if (visibility !== undefined) {
      link.visibility =
        visibility === 'private' ? 'private' : 'public';
    }
    if (isRecipientBound !== undefined) {
      link.isRecipientBound = !!isRecipientBound;
    }
    if (allowedVerificationMethods !== undefined) {
      link.allowedVerificationMethods = allowedVerificationMethods;
    }


    const updated = await link.save();
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error in PUT /api/links/:id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/links/:id/favorite - toggle favorite status (protected)
app.patch('/api/links/:id/favorite', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const link = await Link.findById(id);
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Check ownership by email
    if (link.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'You do not have permission to modify this link' });
    }

    link.isFavorite = !link.isFavorite;
    const updated = await link.save();
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error in PATCH /api/links/:id/favorite:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/links/:id - delete a link (protected)
app.delete('/api/links/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const link = await Link.findById(id);
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Check ownership by email
    if (link.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'You do not have permission to delete this link' });
    }

    await Link.findByIdAndDelete(id);

    return res
      .status(200)
      .json({ message: 'Link deleted successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/links/:id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---- helper to guess device from UA for analytics ----
function getDeviceType(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/mobile/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/bot|crawler|spider/.test(ua)) return 'bot';
  return 'desktop';
}

// ---- helper: choose conditional redirect target ----
function chooseConditionalTarget(link, deviceType, now, clickCount) {
  const rules = link.conditionalRedirect;
  if (!rules || !rules.enabled) return null;

  if (rules.deviceRules) {
    const d = (deviceType || '').toLowerCase();
    if (d === 'mobile' && rules.deviceRules.mobileUrl) return rules.deviceRules.mobileUrl;
    if (d === 'desktop' && rules.deviceRules.desktopUrl) return rules.deviceRules.desktopUrl;
    if (d === 'tablet' && rules.deviceRules.tabletUrl) return rules.deviceRules.tabletUrl;
    if (d === 'bot' && rules.deviceRules.botUrl) return rules.deviceRules.botUrl;
  }

  if (rules.dayTypeRules) {
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend && rules.dayTypeRules.weekendUrl) return rules.dayTypeRules.weekendUrl;
    if (!isWeekend && rules.dayTypeRules.weekdayUrl) return rules.dayTypeRules.weekdayUrl;
  }

  if (Array.isArray(rules.timeOfDayRules)) {
    const hour = now.getHours();
    for (const win of rules.timeOfDayRules) {
      if (!win.url) continue;
      if (
        (win.startHour <= win.endHour && hour >= win.startHour && hour < win.endHour) ||
        (win.startHour > win.endHour && (hour >= win.startHour || hour < win.endHour))
      ) {
        return win.url;
      }
    }
  }

  if (Array.isArray(rules.clickRules)) {
    for (const r of rules.clickRules) {
      const min = typeof r.minClicks === 'number' ? r.minClicks : 0;
      const max = typeof r.maxClicks === 'number' ? r.maxClicks : null;
      if (clickCount >= min && (max === null || clickCount <= max)) {
        return r.url;
      }
    }
  }

  return null;
}

// ---- helper: send webhook ----
function sendWebhook(link, eventType, extra = {}) {
  const cfg = link.webhookConfig;
  if (!cfg || !cfg.enabled || !cfg.url) return;

  let urlObj;
  try {
    urlObj = new URL(cfg.url);
  } catch {
    return;
  }

  const payload = JSON.stringify({
    event: eventType,
    slug: link.slug,
    clicks: link.clicks,
    occurredAt: new Date().toISOString(),
    ...extra,
  });

  const client = urlObj.protocol === 'https:' ? https : http;
  const req = client.request(
    {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    () => { }
  );

  req.write(payload);
  req.end();
}

// ✅ REAL REDIRECT ENDPOINT (SAME LOGIC, CONFLICT-FREE)
app.get('/r/:slug', redirectLimiter, detectDirectAccessAttempt, async (req, res) => {
  try {
    const link = await Link.findOne({ slug: req.params.slug });
    if (!link) return res.status(404).send('VanishLink: Not found');

    if (link.isRecipientBound) {
      return res.status(403).send('VanishLink: This secure link requires a valid invitation token.');
    }

    const now = new Date();

    if (link.expiresAt && now > link.expiresAt) {
      if (link.status !== 'expired') {
        link.status = 'expired';
        await link.save();
        sendWebhook(link, 'expired', { reason: 'time_expired' });
      }
      return res.status(410).send('VanishLink: Expired');
    }

    if (link.scheduleStart && now < link.scheduleStart) {
      return res.status(403).send('VanishLink: Not active yet');
    }

    const limit = link.isOneTime ? 1 : link.maxClicks || 0;
    if (limit > 0 && link.clicks >= limit) {
      return res.status(410).send('VanishLink: Click limit reached');
    }

    const userAgent = req.headers['user-agent'] || '';
    const deviceType = getDeviceType(userAgent);
    const nextClicks = link.clicks + 1;

    let finalTarget = link.targetUrl;
    const conditional = chooseConditionalTarget(link, deviceType, now, nextClicks);
    if (conditional) finalTarget = conditional;

    link.clicks = nextClicks;
    await link.save();

    if (nextClicks === 1) {
      sendWebhook(link, 'first_click');
    }

    if (link.showPreview && req.query.confirm !== '1') {
      const isFlagged = link.moderationStatus === 'flagged' || link.isFlagged;
      const isScanned = link.safetyVerdict !== null;
      let safetyClass = 'unknown';
      let safetyText = 'Not Scanned';
      if (isFlagged) {
        safetyClass = 'flagged';
        safetyText = 'Flagged (Potentially Unsafe)';
      } else if (isScanned) {
        safetyClass = 'clean';
        safetyText = 'Scanned & Safe';
      }

      const previewHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Preview - VanishLink</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 450px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
          h2 { margin-top: 0; font-size: 24px; color: #f8fafc; }
          p { color: #94a3b8; margin-bottom: 24px; font-size: 15px; line-height: 1.6; }
          .destination { background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; word-break: break-all; color: #38bdf8; font-family: ui-monospace, monospace; font-size: 14px; margin-bottom: 24px; text-align: left; }
          .btn { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.2s; cursor: pointer; border: none; width: 100%; box-sizing: border-box; }
          .btn:hover { background: #059669; }
          .safety { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
          .safety.clean { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
          .safety.flagged { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
          .safety.unknown { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Security Preview</h2>
          <p>The creator of this link has enabled preview mode. Please review the destination below before proceeding.</p>
          <div class="safety \${safetyClass}">
            \${safetyText}
          </div>
          <div class="destination">\${finalTarget}</div>
          <a href="?confirm=1" class="btn">Continue to Destination</a>
        </div>
      </body>
      </html>
      `;
      return res.send(previewHtml);
    }

    // Helper to convert YouTube links to embeddable links so they aren't blocked by X-Frame-Options
    let cloakUrl = finalTarget;
    try {
      const urlObj = new URL(finalTarget);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        const v = urlObj.searchParams.get('v');
        if (v) cloakUrl = `https://www.youtube.com/embed/${v}?autoplay=1`;
      } else if (urlObj.hostname === 'youtu.be') {
        const v = urlObj.pathname.slice(1);
        if (v) cloakUrl = `https://www.youtube.com/embed/${v}?autoplay=1`;
      }
    } catch (e) {
      // Ignore URL parsing errors and fallback to original
    }

    // Serve an HTML page with a full-screen iframe to hide the target URL
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${link.title || 'VanishLink'}</title>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #0f172a; font-family: system-ui, -apple-system, sans-serif; }
          iframe { border: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; }
          .fallback-bar { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.95); padding: 16px 24px; z-index: 10; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; backdrop-filter: blur(10px); transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1); }
          .fallback-bar.show { transform: translateY(0); }
          .btn { background: #3b82f6; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); }
          .btn:hover { background: #2563eb; transform: translateY(-1px); }
          .text-container { display: flex; flex-direction: column; gap: 4px; }
          .text-title { color: #f8fafc; font-weight: 600; font-size: 14px; margin: 0; }
          .text-desc { font-size: 13px; color: #94a3b8; margin: 0; }
          @media (max-width: 600px) {
            .fallback-bar { flex-direction: column; gap: 16px; text-align: center; padding: 20px; }
            .btn { width: 100%; text-align: center; box-sizing: border-box; }
          }
        </style>
      </head>
      <body>
        <iframe src="${cloakUrl}" allowfullscreen allow="autoplay; encrypted-media"></iframe>
        
        <div class="fallback-bar" id="fallback">
          <div class="text-container">
            <p class="text-title">Page refusing to connect or blank?</p>
            <p class="text-desc">This website has high security that blocks hidden links.</p>
          </div>
          <a href="${finalTarget}" class="btn">Open Site Directly</a>
        </div>

        <script>
          // Automatically show the fallback bar after 2 seconds
          // This ensures that if the iframe is blocked by X-Frame-Options, the user can still proceed.
          setTimeout(() => {
            document.getElementById('fallback').classList.add('show');
          }, 2000);
        </script>
      </body>
      </html>
    `;
    return res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('VanishLink: Internal server error');
  }
});


// ---------------- SECURE VIEWER ROUTE ---------------- //
app.get('/secure-view/:token', requireZeroTrust, async (req, res) => {
  try {
    const { link, invitation } = req.zeroTrust;
    const finalTarget = link.targetUrl;

    let cloakUrl = finalTarget;
    try {
      const urlObj = new URL(finalTarget);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        const v = urlObj.searchParams.get('v');
        if (v) cloakUrl = `https://www.youtube.com/embed/${v}?autoplay=1`;
      } else if (urlObj.hostname === 'youtu.be') {
        const v = urlObj.pathname.slice(1);
        if (v) cloakUrl = `https://www.youtube.com/embed/${v}?autoplay=1`;
      }
    } catch (e) {
      // Ignore
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${link.title || 'VanishLink Secure View'}</title>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #0f172a; font-family: system-ui, -apple-system, sans-serif; }
          iframe { border: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; }
          .fallback-bar { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.95); padding: 16px 24px; z-index: 10; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; backdrop-filter: blur(10px); transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1); }
          .fallback-bar.show { transform: translateY(0); }
          .btn { background: #3b82f6; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); }
          .btn:hover { background: #2563eb; transform: translateY(-1px); }
          .text-container { display: flex; flex-direction: column; gap: 4px; }
          .text-title { color: #f8fafc; font-weight: 600; font-size: 14px; margin: 0; }
          .text-desc { font-size: 13px; color: #94a3b8; margin: 0; }
          @media (max-width: 600px) {
            .fallback-bar { flex-direction: column; gap: 16px; text-align: center; padding: 20px; }
            .btn { width: 100%; text-align: center; box-sizing: border-box; }
          }
        </style>
      </head>
      <body>
        <iframe src="${cloakUrl}" allowfullscreen allow="autoplay; encrypted-media"></iframe>
        
        <div class="fallback-bar" id="fallback">
          <div class="text-container">
            <p class="text-title">Page refusing to connect or blank?</p>
            <p class="text-desc">This website has high security that blocks hidden links.</p>
          </div>
          <a href="${finalTarget}" class="btn">Open Site Directly</a>
        </div>

        <script>
          setTimeout(() => {
            document.getElementById('fallback').classList.add('show');
          }, 2000);
        </script>
      </body>
      </html>
    `;
    return res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('VanishLink: Internal server error');
  }
});


// ---------------- SOCKET.IO ---------------- //

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// expose io to all routes via req.app.get('io')
app.set('io', io);

// Expose globally for notificationService real-time alerts
global._io = io;

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Allow authenticated users to join their personal notification room
  socket.on('join-user-room', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`📡 User ${userId} joined notification room`);
    }
  });

  socket.on('join-room', ({ roomCode, userName }) => {
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.userName = userName || 'Guest';

    socket.to(roomCode).emit('user-joined', {
      userName: socket.data.userName,
    });
  });

  socket.on('player-action', (payload) => {
    const { roomCode } = payload;
    if (!roomCode) return;
    socket.to(roomCode).emit('player-action', payload);
  });

  socket.on('chat-message', ({ roomCode, userName, message }) => {
    if (!roomCode || !message?.trim()) return;

    io.to(roomCode).emit('chat-message', {
      userName: userName || socket.data.userName || 'Guest',
      message,
      ts: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`API + Socket server running on http://localhost:${PORT}`);
});
