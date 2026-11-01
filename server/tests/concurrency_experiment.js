// server/tests/concurrency_experiment.js
const mongoose = require('mongoose');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5055';

const LinkSchema = new mongoose.Schema({}, { strict: false });
const Link = mongoose.models.Link || mongoose.model('Link', LinkSchema, 'links');

async function makeRequest(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          durationMs: Date.now() - startTime,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        error: err.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

async function runConcurrencyExperiment(concurrencyLevels = [2, 5, 10, 20, 50], trialsPerLevel = 3) {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB: ${MONGO_URI}`);

  const results = [];

  for (const concurrency of concurrencyLevels) {
    console.log(`\n======================================================`);
    console.log(`Testing Concurrency Level: ${concurrency} simultaneous requests`);
    console.log(`======================================================`);

    for (let trial = 1; trial <= trialsPerLevel; trial++) {
      const slug = `race-c${concurrency}-t${trial}-${Date.now().toString(36)}`;
      const targetUrl = `https://example.com/dest-${slug}`;

      // Insert fresh one-time link directly in database
      await Link.create({
        title: `Race Test C=${concurrency} Trial=${trial}`,
        slug,
        targetUrl,
        clicks: 0,
        isOneTime: true,
        maxClicks: 1,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        showPreview: false,
      });

      const requestUrl = `${BASE_URL}/r/${slug}`;

      // Launch requests as simultaneously as possible
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        promises.push(makeRequest(requestUrl));
      }

      const responses = await Promise.all(promises);

      // Analyze responses
      let status200 = 0;
      let status410 = 0;
      let status500 = 0;
      let otherStatus = 0;

      responses.forEach((resp) => {
        if (resp.statusCode === 200) status200++;
        else if (resp.statusCode === 410) status410++;
        else if (resp.statusCode === 500) status500++;
        else otherStatus++;
      });

      // Verification against requirements
      const successfulAccesses = status200;
      const rejectedAccesses = status410;
      const unexpectedSuccesses = Math.max(0, status200 - 1);
      const unexpectedErrors = status500 + otherStatus;

      // Database state verification
      const finalDoc = await Link.findOne({ slug });
      const finalStoredClicks = finalDoc ? finalDoc.get('clicks') : null;
      const finalStatus = finalDoc ? finalDoc.get('status') : null;

      // A test is strictly respected if and only if exactly 1 request succeeded,
      // all other requests received clean rejection (410), 0 unexpected errors (no 500s),
      // and stored clicks == 1.
      const accessLimitRespected = (successfulAccesses === 1 && unexpectedSuccesses === 0);
      const cleanRejection = (status410 === (concurrency - 1) && unexpectedErrors === 0);

      const record = {
        concurrency,
        trial,
        slug,
        totalAttempted: concurrency,
        successfulAccesses,
        rejectedAccesses,
        unexpectedSuccesses,
        unexpectedErrors,
        status200,
        status410,
        status500,
        otherStatus,
        finalStoredClicks,
        finalStatus,
        accessLimitRespected,
        cleanRejection,
      };

      results.push(record);

      console.log(`Trial ${trial} (C=${concurrency}): Attempted=${concurrency} | 200 OK=${status200} | 410 Gone=${status410} | 500 Err=${status500} | DB Clicks=${finalStoredClicks} | Clean=${cleanRejection ? '✅ PASS' : '❌ FAIL (500s or leaks)'}`);
    }
  }

  await mongoose.disconnect();
  return results;
}

const outputFile = process.argv[2] || path.join(__dirname, '../../evidence/concurrency_baseline.json');

runConcurrencyExperiment().then((results) => {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\nBaseline concurrency results saved to: ${outputFile}`);
  process.exit(0);
}).catch((err) => {
  console.error('Experiment failed:', err);
  process.exit(1);
});
