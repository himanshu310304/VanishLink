// server/scripts/safetyScanner.js
// Simple heuristic "AI-ish" safety scanner for Deadman-Link.
// This does NOT call any external ML API – it's fast and local.
//
// Usage example:
//
//   const { computeLinkSafetyForUrl } = require('./scripts/safetyScanner');
//   const safety = computeLinkSafetyForUrl('http://free-money.scam');
//   console.log(safety);
//   // => { safetyScore: 92, safetyVerdict: 'high', reasons: [...], autoFlag: true }

function normalizeUrl(rawUrl = '') {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url = rawUrl.trim();

  // If user forgot http/https, assume http so URL() can parse it
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }

  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
}

function isIpHost(host) {
  // Rough IPv4 or IPv6 check
  if (!host) return false;
  const h = host.trim();
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(h);
  const ipv6 = /:/.test(h);
  return ipv4 || ipv6;
}

// Main function: returns { safetyScore, safetyVerdict, reasons, autoFlag }
function computeLinkSafetyForUrl(rawUrl) {
  const urlObj = normalizeUrl(rawUrl);
  const reasons = [];
  let score = 0;

  if (!urlObj) {
    return {
      safetyScore: 100,
      safetyVerdict: 'high',
      reasons: ['Invalid URL – could not be parsed'],
      autoFlag: true,
    };
  }

  const hostname = urlObj.hostname.toLowerCase();
  const full = (hostname + urlObj.pathname + urlObj.search).toLowerCase();

  // Create a "loose" normalized string where dots and dashes are spaces.
  const loose = full.replace(/[.\-_/]+/g, ' ');

  // 1) Suspicious TLDs
  const riskyTlds = [
    '.ru',
    '.cn',
    '.tk',
    '.ml',
    '.ga',
    '.cf',
    '.gq',
    '.top',
    '.work',
    '.xyz',
    '.zip',
    '.click',
    '.link',
    '.loan',
    '.cam',
    '.monster',
    '.icu',
    '.scam',
  ];

  for (const tld of riskyTlds) {
    if (hostname.endsWith(tld)) {
      score += 20;
      reasons.push(`risky TLD: ${tld}`);
      break;
    }
  }

  // 2) Known shorteners / redirectors
  const shorteners = [
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'is.gd',
    'buff.ly',
    'rebrand.ly',
    'cutt.ly',
    'ow.ly',
  ];
  if (shorteners.some((d) => hostname.endsWith(d))) {
    score += 15;
    reasons.push('uses URL shortener / redirector');
  }

  // 3) Obvious phishing / scam keywords
  const highRiskKeywords = [
    'phishing',
    'free money',
    'free-money',
    'gift card',
    'giveaway',
    'login',
    'signin',
    'verify',
    'verification',
    'password',
    'reset-password',
    'bank',
    'wallet',
    'crypto',
    'binance',
    'metamask',
    'paypal',
    'id.rakuten', // example
    'support-login',
    'account locked',
    'account-locked',
    'update-account',
    'update-billing',
    'win cash',
    'winner',
    'lottery',
    'casino',
    'betting',
    'scam',
  ];

  highRiskKeywords.forEach((kw) => {
    const k = kw.toLowerCase();
    if (loose.includes(k)) {
      score += 12;
      reasons.push(`high-risk keyword: "${kw}"`);
    }
  });

  // 4) Medium-risk “spammy” patterns
  const mediumRiskKeywords = [
    'click here',
    'click-here',
    'bonus',
    'deal',
    'discount',
    'cheap',
    'offer',
    'promo',
    'limited-time',
    'earn money',
    'make money',
  ];

  mediumRiskKeywords.forEach((kw) => {
    const k = kw.toLowerCase();
    if (loose.includes(k)) {
      score += 7;
      reasons.push(`suspicious phrase: "${kw}"`);
    }
  });

  // 5) Host is raw IP
  if (isIpHost(hostname)) {
    score += 20;
    reasons.push('host is an IP address, not a domain');
  }

  // 6) Very long URL
  const raw = rawUrl.toString();
  if (raw.length > 120) {
    score += 8;
    reasons.push('very long URL (>120 chars)');
  }
  if (raw.length > 220) {
    score += 8;
    reasons.push('extremely long URL (>220 chars)');
  }

  // 7) Too many subdomains (like a.b.c.d.e.example.com)
  const labels = hostname.split('.');
  if (labels.length >= 5) {
    score += 6;
    reasons.push('unusually deep subdomain structure');
  }

  // 8) Mixed-brand style (digits + weird chars) in main label
  const mainLabel = labels.length ? labels[labels.length - 2] || '' : '';
  if (/[0-9]/.test(mainLabel) && /[a-z]/.test(mainLabel) && mainLabel.length > 10) {
    score += 6;
    reasons.push('main domain looks auto-generated / random');
  }

  // Clamp score to [0, 100]
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Verdict
  let verdict = 'low';
  if (score >= 70) verdict = 'high';
  else if (score >= 40) verdict = 'medium';

  const autoFlag = verdict !== 'low';

  return {
    safetyScore: score,
    safetyVerdict: verdict,
    reasons,
    autoFlag,
  };
}

// Convenience helper if you want to pass a Link document
// (expects link.targetUrl or link.url)
function computeLinkSafetyForLink(linkDoc) {
  const url = linkDoc?.targetUrl || linkDoc?.url || '';
  return computeLinkSafetyForUrl(url);
}

module.exports = {
  computeLinkSafetyForUrl,
  computeLinkSafetyForLink,
};
