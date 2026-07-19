// testSafety.js
const { computeLinkSafetyForUrl } = require('./scripts/safetyScanner');

console.log(computeLinkSafetyForUrl('http://free-money.scam'));
console.log(computeLinkSafetyForUrl('https://github.com'));
