// server/utils/linkSimilarity.js
const { URL } = require('url');

const STOP_WORDS = new Set([
  'the','a','an','of','and','or','to','for','in','on','at','with','by','is',
  'this','that','these','those','you','your','my','our','from','about','as'
]);

function safeParseUrl(urlString) {
  try {
    return new URL(urlString);
  } catch (e) {
    return null;
  }
}

function normalizeDomain(urlObj) {
  if (!urlObj) return null;
  return urlObj.hostname.replace(/^www\./i, '').toLowerCase();
}

function normalizePath(urlObj) {
  if (!urlObj) return '';
  return urlObj.pathname.replace(/\/+$/, '').toLowerCase(); // remove trailing /
}

function getLastSlug(pathname) {
  if (!pathname) return null;
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return null;
  const last = parts[parts.length - 1];
  if (!last || last.length < 4) return null;
  return last.toLowerCase();
}

// YouTube video ID
function getYouTubeId(urlObj) {
  if (!urlObj) return null;
  const host = normalizeDomain(urlObj);
  if (!host) return null;

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }
  }
  if (host === 'youtu.be') {
    return urlObj.pathname.split('/').filter(Boolean)[0] || null;
  }
  return null;
}

// Twitter/X status ID
function getTwitterStatusId(urlObj) {
  if (!urlObj) return null;
  const host = normalizeDomain(urlObj);
  if (!host) return null;

  if (host === 'twitter.com' || host === 'x.com') {
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const statusIndex = parts.indexOf('status');
    if (statusIndex !== -1 && parts[statusIndex + 1]) {
      return parts[statusIndex + 1];
    }
  }
  return null;
}

function extractKeywords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

// targetLink: { targetUrl, title, metaDescription }
// candidateLink: a Link document/lean object
function scoreSimilarity(targetLink, candidateLink) {
  let score = 0;
  const reasons = [];

  const targetUrl = safeParseUrl(targetLink.targetUrl);
  const candidateUrl = safeParseUrl(candidateLink.targetUrl);

  const targetDomain = normalizeDomain(targetUrl);
  const candidateDomain = normalizeDomain(candidateUrl);

  const targetPath = normalizePath(targetUrl);
  const candidatePath = normalizePath(candidateUrl);

  // 1. Same domain
  if (targetDomain && candidateDomain && targetDomain === candidateDomain) {
    score += 3;
    reasons.push('same-domain');
  }

  // 2. Same / similar path
  if (targetPath && candidatePath) {
    if (targetPath === candidatePath) {
      score += 4;
      reasons.push('same-path');
    } else if (
      targetPath.startsWith(candidatePath) ||
      candidatePath.startsWith(targetPath)
    ) {
      score += 2;
      reasons.push('similar-path');
    }

    // generic slug match (Notion / Medium / blogs etc.)
    const targetSlug = getLastSlug(targetPath);
    const candidateSlug = getLastSlug(candidatePath);
    if (targetSlug && candidateSlug && targetSlug === candidateSlug) {
      score += 4;
      reasons.push('same-slug');
    }
  }

  // 3. Platform-specific IDs

  const targetYouTubeId = getYouTubeId(targetUrl);
  const candidateYouTubeId = getYouTubeId(candidateUrl);
  if (targetYouTubeId && candidateYouTubeId && targetYouTubeId === candidateYouTubeId) {
    score += 10;
    reasons.push('same-youtube-video');
  }

  const targetTweetId = getTwitterStatusId(targetUrl);
  const candidateTweetId = getTwitterStatusId(candidateUrl);
  if (targetTweetId && candidateTweetId && targetTweetId === candidateTweetId) {
    score += 10;
    reasons.push('same-tweet');
  }

  // 4. Title / meta keyword overlap
  const targetKeywords = new Set(
    extractKeywords(`${targetLink.title || ''} ${targetLink.metaDescription || ''}`)
  );
  const candidateKeywords = new Set(
    extractKeywords(`${candidateLink.title || ''} ${candidateLink.metaDescription || ''}`)
  );

  const keywordSim = jaccardSimilarity(targetKeywords, candidateKeywords);
  if (keywordSim >= 0.3) {
    score += 3;
    reasons.push('title-keyword-overlap');
  } else if (keywordSim >= 0.15) {
    score += 1;
    reasons.push('light-keyword-overlap');
  }

  return { score, reasons };
}

module.exports = {
  scoreSimilarity,
};
