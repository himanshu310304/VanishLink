// server/tests/security.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';
const JWT_SECRET = process.env.JWT_SECRET || 'VanishLink2025SecureKey!@$%^&*()_.+';

let app;
let Link;
let OTP;
let userToken;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = MONGO_URI;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const serverModule = require('../index');
  app = serverModule.app;
  Link = require('../models/Link');
  OTP = require('../models/OTP');

  userToken = jwt.sign(
    { sub: new mongoose.Types.ObjectId().toString(), email: 'secuser@test.com', role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Phase 6 - Security Validation & Hardening Tests', () => {
  test('GET /api/links/public does NOT expose password and does NOT leak private links', async () => {
    // Create one public link with password
    const publicSlug = `sec-pub-${Date.now()}`;
    await Link.create({
      title: 'Public Protected Doc',
      slug: publicSlug,
      targetUrl: 'https://example.com/pub-doc',
      password: 'SuperSecretPlainTextPassword999',
      visibility: 'public',
      status: 'active',
      clicks: 0,
    });

    // Create one private link
    const privSlug = `sec-priv-${Date.now()}`;
    await Link.create({
      title: 'Top Secret Private Doc',
      slug: privSlug,
      targetUrl: 'https://example.com/priv-doc',
      visibility: 'private',
      status: 'active',
      clicks: 0,
    });

    const res = await request(app)
      .get('/api/links/public')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const publicItem = res.body.find((l) => l.slug === publicSlug);
    expect(publicItem).toBeDefined();
    expect(publicItem.password).toBeUndefined(); // PASSWORD MUST NOT BE EXPOSED

    const privItem = res.body.find((l) => l.slug === privSlug);
    expect(privItem).toBeUndefined(); // PRIVATE LINK MUST NOT BE IN PUBLIC LIST
  });

  test('Input Validation: javascript: protocol is strictly rejected with 400', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetUrl: 'javascript:alert(document.cookie)',
        title: 'XSS Attack Link',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid URL protocol/i);
  });

  test('Input Validation: data: protocol is strictly rejected with 400', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetUrl: 'data:text/html,<script>alert(1)</script>',
        title: 'Data URI Exploit',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid URL protocol/i);
  });

  test('OTP Brute-Force Protection: 5 failed verification attempts invalidate the code and return 429', async () => {
    const email = `brute-${Date.now()}@example.com`;
    const realCode = '123456';

    await OTP.create({
      email,
      code: realCode,
      purpose: 'register',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      meta: { name: 'Brute Test', passwordHash: 'dummy' },
    });

    // 4 failed attempts: return 401
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/auth/register/verify')
        .send({ email, code: `99990${i}` });
      expect(res.status).toBe(401);
    }

    // 5th failed attempt: triggers lockout and returns 429
    const res5 = await request(app)
      .post('/api/auth/register/verify')
      .send({ email, code: '999905' });
    expect(res5.status).toBe(429);
    expect(res5.body.message).toMatch(/Too many failed verification attempts/i);

    // Verify OTP was destroyed in database
    const checkDb = await OTP.findOne({ email, purpose: 'register' });
    expect(checkDb).toBeNull();
  });
});

