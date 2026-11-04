// server/tests/concurrency.test.js
const request = require('supertest');
const mongoose = require('mongoose');

// Point to local test database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';

let app;
let Link;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = MONGO_URI;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Load app and Link model
  const serverModule = require('../index');
  app = serverModule.app;
  Link = require('../models/Link');
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Concurrency & Race Condition Regression Suite', () => {
  test('Strict one-time link: 10 concurrent requests must yield exactly 1 success (200), 9 rejections (410), 0 errors (500)', async () => {
    const slug = `jest-onetime-${Date.now()}`;
    const targetUrl = `https://example.com/target-${slug}`;

    await Link.create({
      title: 'Jest One Time Test',
      slug,
      targetUrl,
      clicks: 0,
      isOneTime: true,
      maxClicks: 1,
      status: 'active',
      showPreview: false,
    });

    // Fire 10 simultaneous requests
    const promises = Array.from({ length: 10 }, () =>
      request(app).get(`/r/${slug}`)
    );

    const responses = await Promise.all(promises);

    const successes = responses.filter((r) => r.status === 200);
    const rejections = responses.filter((r) => r.status === 410);
    const serverErrors = responses.filter((r) => r.status === 500);

    // Assertions
    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(9);
    expect(serverErrors.length).toBe(0);

    // Verify DB counter
    const updated = await Link.findOne({ slug });
    expect(updated.clicks).toBe(1);
    expect(updated.status).toBe('expired');
  });

  test('Multi-click link (maxClicks=3): 10 concurrent requests must yield exactly 3 successes (200), 7 rejections (410), 0 errors (500)', async () => {
    const slug = `jest-multiclick-${Date.now()}`;
    const targetUrl = `https://example.com/target-${slug}`;

    await Link.create({
      title: 'Jest Multi Click Test',
      slug,
      targetUrl,
      clicks: 0,
      isOneTime: false,
      maxClicks: 3,
      status: 'active',
      showPreview: false,
    });

    // Fire 10 simultaneous requests
    const promises = Array.from({ length: 10 }, () =>
      request(app).get(`/r/${slug}`)
    );

    const responses = await Promise.all(promises);

    const successes = responses.filter((r) => r.status === 200);
    const rejections = responses.filter((r) => r.status === 410);
    const serverErrors = responses.filter((r) => r.status === 500);

    expect(successes.length).toBe(3);
    expect(rejections.length).toBe(7);
    expect(serverErrors.length).toBe(0);

    const updated = await Link.findOne({ slug });
    expect(updated.clicks).toBe(3);
    expect(updated.status).toBe('expired');
  });

  test('Scheduled link: Concurrent requests prior to scheduleStart must all be rejected (403)', async () => {
    const slug = `jest-scheduled-${Date.now()}`;
    const targetUrl = `https://example.com/target-${slug}`;
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future

    await Link.create({
      title: 'Jest Scheduled Test',
      slug,
      targetUrl,
      clicks: 0,
      scheduleStart: futureDate,
      status: 'active',
      showPreview: false,
    });

    const promises = Array.from({ length: 5 }, () =>
      request(app).get(`/r/${slug}`)
    );

    const responses = await Promise.all(promises);

    responses.forEach((r) => {
      expect(r.status).toBe(403);
      expect(r.text).toContain('Not active yet');
    });

    const updated = await Link.findOne({ slug });
    expect(updated.clicks).toBe(0);
  });

  test('Expired link: Concurrent requests after expiresAt must all be rejected (410)', async () => {
    const slug = `jest-expired-${Date.now()}`;
    const targetUrl = `https://example.com/target-${slug}`;
    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    await Link.create({
      title: 'Jest Expired Test',
      slug,
      targetUrl,
      clicks: 0,
      expiresAt: pastDate,
      status: 'active',
      showPreview: false,
    });

    const promises = Array.from({ length: 5 }, () =>
      request(app).get(`/r/${slug}`)
    );

    const responses = await Promise.all(promises);

    responses.forEach((r) => {
      expect(r.status).toBe(410);
      expect(r.text).toContain('Expired');
    });

    const updated = await Link.findOne({ slug });
    expect(updated.status).toBe('expired');
    expect(updated.clicks).toBe(0);
  });
});

