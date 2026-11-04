// server/scripts/db_index_benchmark.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';

async function runIndexBenchmark() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const linksCol = db.collection('links');
  const analyticsCol = db.collection('analyticsevents');

  console.log('Seeding dataset for database query and index benchmark...');

  // Target user for testing
  const targetEmail = 'bench-owner@example.com';
  const otherEmails = ['alice@example.com', 'bob@example.com', 'carol@example.com', 'dan@example.com'];

  // Check existing count
  const existingCount = await linksCol.countDocuments({ benchmarkData: true });
  if (existingCount < 10000) {
    console.log(`Current benchmark links: ${existingCount}. Seeding up to 10,000 links...`);
    const linksToInsert = [];
    for (let i = existingCount; i < 10000; i++) {
      const isTarget = i % 100 === 0; // 100 links belonging to target user
      linksToInsert.push({
        title: `Benchmark Link ${i}`,
        slug: `bench-seed-slug-${i}-${Date.now().toString(36)}`,
        targetUrl: `https://example.com/target-${i}`,
        ownerEmail: isTarget ? targetEmail : otherEmails[i % otherEmails.length],
        clicks: Math.floor(Math.random() * 50),
        status: 'active',
        createdAt: new Date(Date.now() - (i * 60 * 1000)), // spread over time
        benchmarkData: true,
      });
    }

    if (linksToInsert.length > 0) {
      await linksCol.insertMany(linksToInsert);
    }
  }

  // Get target user links
  const targetLinks = await linksCol.find({ ownerEmail: targetEmail }).limit(20).toArray();
  const targetLinkIds = targetLinks.map((l) => l._id);

  // Seed analytics events
  const existingAnalytics = await analyticsCol.countDocuments({ benchmarkData: true });
  if (existingAnalytics < 20000) {
    console.log(`Current benchmark analytics events: ${existingAnalytics}. Seeding up to 20,000 events...`);
    const eventsToInsert = [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (let i = existingAnalytics; i < 20000; i++) {
      const isTargetLink = i % 50 === 0;
      eventsToInsert.push({
        link: isTargetLink ? targetLinkIds[i % targetLinkIds.length] : new mongoose.Types.ObjectId(),
        slug: `event-slug-${i}`,
        deviceType: i % 2 === 0 ? 'mobile' : 'desktop',
        country: 'US',
        ip: '127.0.0.1',
        createdAt: new Date(sevenDaysAgo + Math.random() * 7 * 24 * 60 * 60 * 1000),
        benchmarkData: true,
      });
    }

    if (eventsToInsert.length > 0) {
      await analyticsCol.insertMany(eventsToInsert);
    }
  }

  console.log('Seeding complete. Starting baseline query analysis (WITHOUT INDEXES)...');

  // Ensure test indexes do not exist yet
  try { await linksCol.dropIndex('ownerEmail_1_createdAt_-1'); } catch (e) {}
  try { await analyticsCol.dropIndex('link_1_createdAt_-1'); } catch (e) {}

  // 1. Measure Query 1: User links dashboard query: { ownerEmail: targetEmail }, sort: { createdAt: -1 }
  const baselineQuery1 = await linksCol
    .find({ ownerEmail: targetEmail })
    .sort({ createdAt: -1 })
    .explain('executionStats');

  // 2. Measure Query 2: Analytics events query: { link: { $in: targetLinkIds }, createdAt: { $gte: 7 days ago } }
  const sevenDaysDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const baselineQuery2 = await analyticsCol
    .find({ link: { $in: targetLinkIds }, createdAt: { $gte: sevenDaysDate } })
    .explain('executionStats');

  console.log('\n--- BASELINE EXPLAIN STATS ---');
  console.log('Query 1 (Links by Owner):');
  console.log({
    stage: baselineQuery1.executionStats.executionStages.stage,
    nReturned: baselineQuery1.executionStats.nReturned,
    totalDocsExamined: baselineQuery1.executionStats.totalDocsExamined,
    executionTimeMillis: baselineQuery1.executionStats.executionTimeMillis,
    totalKeysExamined: baselineQuery1.executionStats.totalKeysExamined,
  });

  console.log('Query 2 (Analytics Events):');
  console.log({
    stage: baselineQuery2.executionStats.executionStages.stage,
    nReturned: baselineQuery2.executionStats.nReturned,
    totalDocsExamined: baselineQuery2.executionStats.totalDocsExamined,
    executionTimeMillis: baselineQuery2.executionStats.executionTimeMillis,
    totalKeysExamined: baselineQuery2.executionStats.totalKeysExamined,
  });

  // Now create compound indexes
  console.log('\nCreating compound indexes...');
  console.log('1. links: { ownerEmail: 1, createdAt: -1 }');
  await linksCol.createIndex({ ownerEmail: 1, createdAt: -1 });

  console.log('2. analyticsevents: { link: 1, createdAt: -1 }');
  await analyticsCol.createIndex({ link: 1, createdAt: -1 });

  // Measure queries again under identical conditions
  console.log('\nMeasuring queries WITH COMPOUND INDEXES...');

  const optimizedQuery1 = await linksCol
    .find({ ownerEmail: targetEmail })
    .sort({ createdAt: -1 })
    .explain('executionStats');

  const optimizedQuery2 = await analyticsCol
    .find({ link: { $in: targetLinkIds }, createdAt: { $gte: sevenDaysDate } })
    .explain('executionStats');

  console.log('\n--- OPTIMIZED EXPLAIN STATS ---');
  console.log('Query 1 (Links by Owner):');
  console.log({
    stage: optimizedQuery1.executionStats.executionStages.stage,
    nReturned: optimizedQuery1.executionStats.nReturned,
    totalDocsExamined: optimizedQuery1.executionStats.totalDocsExamined,
    executionTimeMillis: optimizedQuery1.executionStats.executionTimeMillis,
    totalKeysExamined: optimizedQuery1.executionStats.totalKeysExamined,
  });

  console.log('Query 2 (Analytics Events):');
  console.log({
    stage: optimizedQuery2.executionStats.executionStages.stage,
    nReturned: optimizedQuery2.executionStats.nReturned,
    totalDocsExamined: optimizedQuery2.executionStats.totalDocsExamined,
    executionTimeMillis: optimizedQuery2.executionStats.executionTimeMillis,
    totalKeysExamined: optimizedQuery2.executionStats.totalKeysExamined,
  });

  const report = {
    dataset: {
      totalLinks: await linksCol.countDocuments(),
      totalAnalyticsEvents: await analyticsCol.countDocuments(),
    },
    query1_links_by_owner: {
      query: "{ ownerEmail: targetEmail }, sort: { createdAt: -1 }",
      baseline: {
        stage: baselineQuery1.executionStats.executionStages.stage,
        totalDocsExamined: baselineQuery1.executionStats.totalDocsExamined,
        totalKeysExamined: baselineQuery1.executionStats.totalKeysExamined,
        executionTimeMillis: baselineQuery1.executionStats.executionTimeMillis,
        nReturned: baselineQuery1.executionStats.nReturned,
      },
      optimized: {
        indexAdded: "{ ownerEmail: 1, createdAt: -1 }",
        stage: optimizedQuery1.executionStats.executionStages.stage,
        totalDocsExamined: optimizedQuery1.executionStats.totalDocsExamined,
        totalKeysExamined: optimizedQuery1.executionStats.totalKeysExamined,
        executionTimeMillis: optimizedQuery1.executionStats.executionTimeMillis,
        nReturned: optimizedQuery1.executionStats.nReturned,
      },
    },
    query2_analytics_events: {
      query: "{ link: { $in: [ids] }, createdAt: { $gte: 7days } }",
      baseline: {
        stage: baselineQuery2.executionStats.executionStages.stage,
        totalDocsExamined: baselineQuery2.executionStats.totalDocsExamined,
        totalKeysExamined: baselineQuery2.executionStats.totalKeysExamined,
        executionTimeMillis: baselineQuery2.executionStats.executionTimeMillis,
        nReturned: baselineQuery2.executionStats.nReturned,
      },
      optimized: {
        indexAdded: "{ link: 1, createdAt: -1 }",
        stage: optimizedQuery2.executionStats.executionStages.stage,
        totalDocsExamined: optimizedQuery2.executionStats.totalDocsExamined,
        totalKeysExamined: optimizedQuery2.executionStats.totalKeysExamined,
        executionTimeMillis: optimizedQuery2.executionStats.executionTimeMillis,
        nReturned: optimizedQuery2.executionStats.nReturned,
      },
    },
  };

  const outputPath = path.join(__dirname, '../../evidence/database_index_analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${outputPath}`);

  await mongoose.disconnect();
}

runIndexBenchmark().catch(console.error);

