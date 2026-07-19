// server/scripts/urlSafety.js
const { URL } = require('url');

function isIp(hostname) {
  return /^[0-9.]+$/.test(hostname);
}

function isPrivateIp(hostname) {
  if (!isIp(hostname)) return false;
  const parts = hostname.split('.').map((x) => parseInt(x, 10));
  if (parts.length !== 4) return false;

  const [a, b] = parts;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16–31.0.0/16

  return false;
}

function basicUrlSafetyCheck(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    // if it’s not even a valid URL, treat it as high risk
    return {
      url: rawUrl,
      hostname: null,
      score: 80,
      verdict: 'high',
      reasons: ['URL is not a valid URL'],
      flagRecommended: true,
    };
  }

  const reasons = [];
  let score = 0;

  const hostname = (parsed.hostname || '').toLowerCase();
  const protocol = parsed.protocol || '';
  const full = rawUrl.toLowerCase();
  const path = (parsed.pathname + parsed.search + parsed.hash).toLowerCase();

  // 1) HTTP instead of HTTPS
  if (protocol === 'http:') {
    score += 15;
    reasons.push('not using https (unencrypted)');
  }

  // 2) IP address as host
  if (isIp(hostname)) {
    score += 25;
    reasons.push('host is an IP address, not a domain');

    if (isPrivateIp(hostname)) {
      score += 10;
      reasons.push('IP address is from a private/local range');
    }
  }

  // 3) Suspicious TLDs
  const tldMatch = hostname.split('.').pop();
  const riskyTlds = [
    'ru',
    'cn',
    'tk',
    'ml',
    'ga',
    'cf',
    'gq',
    'work',
    'click',
    'xyz',
    'zip',
    'lol',
    'support',
    'help',
  ];
  if (tldMatch && riskyTlds.includes(tldMatch)) {
    score += 20;
    reasons.push(`risky TLD: .${tldMatch}`);
  }

  // 4) Punycode domains (xn--)
  if (hostname.includes('xn--')) {
    score += 25;
    reasons.push('punycode (xn--) domain, often used for look-alikes');
  }

  // 5) High-risk keywords in host or path
  const riskyKeywords = [
    'login',
    'verify',
    'update',
    'secure',
    'security',
    'account',
    'wallet',
    'bank',
    'paypal',
    'crypto',
    'airdrop',
    'gift',
    'reward',
    'claim',
    'free-money',
    'password',
  ];

  const whereToScan = hostname + ' ' + path;
  const foundKeywords = new Set();

  for (const kw of riskyKeywords) {
    if (whereToScan.includes(kw)) {
      foundKeywords.add(kw);
    }
  }

  if (foundKeywords.size) {
    const keywordsText = Array.from(foundKeywords)
      .map((k) => `"${k}"`)
      .join(', ');
    reasons.push(`high-risk keyword(s): ${keywordsText}`);

    // cap keyword contribution so it doesn't explode
    score += Math.min(foundKeywords.size * 10, 40);
  }

  // 6) '@' in URL (phishing trick)
  if (full.includes('@')) {
    score += 20;
    reasons.push('URL contains "@", which is often used in phishing links');
  }

  // 7) Very long URLs
  if (rawUrl.length > 250) {
    score += 20;
    reasons.push('URL is extremely long');
  } else if (rawUrl.length > 120) {
    score += 10;
    reasons.push('URL is unusually long');
  }

  // Final verdict
  let verdict = 'low';
  let flagRecommended = false;

  if (reasons.length === 0) {
    // absolutely nothing suspicious
    score = 0;
    verdict = 'low';
  } else if (score >= 70) {
    verdict = 'high';
    flagRecommended = true; // auto-flag these
  } else if (score >= 40) {
    verdict = 'medium';
  } else {
    verdict = 'low';
  }

  return {
    url: rawUrl,
    hostname,
    score,
    verdict,
    reasons,
    flagRecommended,
  };
}

module.exports = {
  basicUrlSafetyCheck,
};
