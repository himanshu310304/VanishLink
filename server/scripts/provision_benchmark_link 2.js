// server/scripts/provision_benchmark_link.js
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';

async function provision() {
  await mongoose.connect(MONGO_URI);
  const Link = mongoose.models.Link || mongoose.model('Link', new mongoose.Schema({}, { strict: false }), 'links');

  const slug = 'benchmark-link';
  await Link.deleteOne({ slug });

  const link = await Link.create({
    title: 'Benchmark Reusable Link',
    slug,
    targetUrl: 'https://example.com/bench-dest',
    clicks: 0,
    isOneTime: false,
    maxClicks: 0, // unlimited
    status: 'active',
    showPreview: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Provisioned benchmark link: ${slug} -> ${link.targetUrl}`);
  await mongoose.disconnect();
}

provision().catch(console.error);

