// server/tests/api_links.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';
const JWT_SECRET = process.env.JWT_SECRET || 'VanishLink2025SecureKey!@$%^&*()_.+';

let app;
let Link;
let userToken;
let otherUserToken;
const userEmail = 'linktester@example.com';
const otherUserEmail = 'otherperson@example.com';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = MONGO_URI;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const serverModule = require('../index');
  app = serverModule.app;
  Link = require('../models/Link');

  // Sign tokens
  userToken = jwt.sign(
    { sub: new mongoose.Types.ObjectId().toString(), email: userEmail, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  otherUserToken = jwt.sign(
    { sub: new mongoose.Types.ObjectId().toString(), email: otherUserEmail, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Phase 3 - Link Management API Tests', () => {
  test('Valid link creation (POST /api/links) returns 201 with generated slug', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetUrl: 'https://github.com/torvalds/linux',
        title: 'Linux Kernel Repo',
        visibility: 'public',
        ownerEmail: userEmail,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('slug');
    expect(res.body.targetUrl).toBe('https://github.com/torvalds/linux');
    expect(res.body.clicks).toBe(0);
    expect(res.body.status).toBe('active');
  });

  test('Invalid link creation without targetUrl returns 400', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'No URL Provided',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/destination url is required/i);
  });

  test('Custom slug collision returns 409 conflict', async () => {
    const customSlug = `custom-slug-${Date.now()}`;

    // Create initial link
    const first = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetUrl: 'https://example.com/one',
        slug: customSlug,
        ownerEmail: userEmail,
      });
    expect(first.status).toBe(201);

    // Attempt second link with same slug
    const duplicate = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetUrl: 'https://example.com/two',
        slug: customSlug,
        ownerEmail: userEmail,
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toMatch(/slug already taken/i);
  });

  test('One-time link creation and access enforcement via redirect', async () => {
    const slug = `api-onetime-${Date.now()}`;
    const targetUrl = 'https://example.com/secret-document';

    const createRes = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slug,
        targetUrl,
        isOneTime: true,
        maxClicks: 1,
        ownerEmail: userEmail,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.isOneTime).toBe(true);

    // 1st access succeeds
    const access1 = await request(app).get(`/r/${slug}`);
    expect(access1.status).toBe(200);
    expect(access1.text).toContain(targetUrl);

    // 2nd access rejected with 410
    const access2 = await request(app).get(`/r/${slug}`);
    expect(access2.status).toBe(410);
    expect(access2.text).toContain('Click limit reached');
  });

  test('Click-limited link (maxClicks=2) enforcement via redirect', async () => {
    const slug = `api-limit2-${Date.now()}`;
    const targetUrl = 'https://example.com/click-limit-target';

    await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slug,
        targetUrl,
        isOneTime: false,
        maxClicks: 2,
        ownerEmail: userEmail,
      });

    // 1st click
    const res1 = await request(app).get(`/r/${slug}`);
    expect(res1.status).toBe(200);

    // 2nd click
    const res2 = await request(app).get(`/r/${slug}`);
    expect(res2.status).toBe(200);

    // 3rd click: rejected
    const res3 = await request(app).get(`/r/${slug}`);
    expect(res3.status).toBe(410);
    expect(res3.text).toContain('Click limit reached');
  });

  test('Scheduled activation (scheduleStart in future) returns 403 on redirect', async () => {
    const slug = `api-sched-${Date.now()}`;
    const targetUrl = 'https://example.com/future-target';
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slug,
        targetUrl,
        scheduleStart: futureDate,
        ownerEmail: userEmail,
      });

    const res = await request(app).get(`/r/${slug}`);
    expect(res.status).toBe(403);
    expect(res.text).toContain('Not active yet');
  });

  test('Expired link (expiresAt in past) returns 410 on redirect', async () => {
    const slug = `api-exp-${Date.now()}`;
    const targetUrl = 'https://example.com/past-target';
    const pastDate = new Date(Date.now() - 1000 * 60).toISOString();

    await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slug,
        targetUrl,
        expiresAt: pastDate,
        ownerEmail: userEmail,
      });

    const res = await request(app).get(`/r/${slug}`);
    expect(res.status).toBe(410);
    expect(res.text).toContain('Expired');
  });

  test('Password-protected link flag is stored correctly', async () => {
    const slug = `api-pw-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slug,
        targetUrl: 'https://example.com/pw-target',
        password: 'SuperSecretPassword123',
        ownerEmail: userEmail,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.password).toBe('SuperSecretPassword123');
  });

  test('Link preview mode serves preview screen instead of iframe when confirm != 1', async () => {
    const slug = `api-preview-${Date.now()}`;
    const targetUrl = 'https://example.com/preview-target';

    await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        slug,
        targetUrl,
        showPreview: true,
        ownerEmail: userEmail,
      });

    // Request without confirm=1 returns security preview card
    const res = await request(app).get(`/r/${slug}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Security Preview');
    expect(res.text).toContain('Continue to Destination');

    // Request with confirm=1 completes redirect to destination
    const confirmedRes = await request(app).get(`/r/${slug}?confirm=1`);
    expect(confirmedRes.status).toBe(200);
    expect(confirmedRes.text).toContain(targetUrl);
  });

  test('Nonexistent link slug on redirect returns 404', async () => {
    const res = await request(app).get('/r/completely-nonexistent-slug-xyz-999');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Not found');
  });

  test('Updating a link (PUT /api/links/:id) succeeds for link owner', async () => {
    const link = await Link.create({
      title: 'Original Title',
      slug: `update-test-${Date.now()}`,
      targetUrl: 'https://example.com/original',
      ownerEmail: userEmail,
      clicks: 0,
    });

    const res = await request(app)
      .put(`/api/links/${link._id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Updated Title',
        targetUrl: 'https://example.com/updated',
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.targetUrl).toBe('https://example.com/updated');
  });

  test('Deleting a link (DELETE /api/links/:id) succeeds for link owner', async () => {
    const link = await Link.create({
      title: 'To Be Deleted',
      slug: `delete-test-${Date.now()}`,
      targetUrl: 'https://example.com/delete-me',
      ownerEmail: userEmail,
      clicks: 0,
    });

    const res = await request(app)
      .delete(`/api/links/${link._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);

    const check = await Link.findById(link._id);
    expect(check).toBeNull();
  });

  test('Invalid / nonexistent link ID returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/links/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'New Title' });

    expect(res.status).toBe(404);
  });
});

