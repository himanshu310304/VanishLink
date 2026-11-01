// server/tests/api_auth_security.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';
const JWT_SECRET = process.env.JWT_SECRET || 'VanishLink2025SecureKey!@$%^&*()_.+';

let app;
let User;
let Link;
let OTP;

let regularUser;
let regularUserToken;
let otherUser;
let otherUserToken;
let adminUser;
let adminUserToken;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = MONGO_URI;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const serverModule = require('../index');
  app = serverModule.app;
  User = require('../models/User');
  Link = require('../models/Link');
  OTP = require('../models/OTP');

  // Clean test users
  await User.deleteMany({ email: { $in: ['user1@test.com', 'user2@test.com', 'admin@test.com', 'registered@test.com'] } });

  // Create test regular user
  const hashedPassword = await bcrypt.hash('CorrectPass123', 10);
  regularUser = await User.create({
    name: 'Regular User One',
    email: 'user1@test.com',
    password: hashedPassword,
    role: 'user',
  });

  otherUser = await User.create({
    name: 'Regular User Two',
    email: 'user2@test.com',
    password: hashedPassword,
    role: 'user',
  });

  adminUser = await User.create({
    name: 'Admin Boss',
    email: 'admin@test.com',
    password: hashedPassword,
    role: 'admin',
  });

  regularUserToken = jwt.sign(
    { sub: regularUser._id.toString(), email: regularUser.email, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  otherUserToken = jwt.sign(
    { sub: otherUser._id.toString(), email: otherUser.email, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  adminUserToken = jwt.sign(
    { sub: adminUser._id.toString(), email: adminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Phase 3 - Authentication, Authorization, RBAC & Security Tests', () => {
  // ---- JWT TESTS ----
  describe('JWT Verification', () => {
    test('Request with missing Authorization header returns 401 Missing token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/missing token/i);
    });

    test('Request with invalid JWT string returns 401 Invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid token/i);
    });

    test('Request with expired JWT returns 401 Invalid token', async () => {
      const expiredToken = jwt.sign(
        { sub: regularUser._id.toString(), email: regularUser.email, role: 'user' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid token/i);
    });

    test('Request with valid JWT returns 200 and user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('user1@test.com');
      expect(res.body.user.role).toBe('user');
    });
  });

  // ---- LOGIN TESTS ----
  describe('Login Validation', () => {
    test('Login with nonexistent email returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'SomePassword123' });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    test('Login with wrong password returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user1@test.com', password: 'WrongPassword999' });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    test('Login with missing fields returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user1@test.com' });
      expect(res.status).toBe(400);
    });

    test('Login with valid credentials returns 200 with valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user1@test.com', password: 'CorrectPass123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('user1@test.com');
    });
  });

  // ---- OTP REGISTRATION FLOW ----
  describe('OTP Registration Flow', () => {
    let regEmail;

    beforeAll(() => {
      regEmail = `newregister-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`;
    });

    test('Initiating registration with short password (<6 chars) returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/register/initiate')
        .send({ name: 'Shorty', email: regEmail, password: '123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    test('Valid registration initiates OTP creation', async () => {
      const res = await request(app)
        .post('/api/auth/register/initiate')
        .send({ name: 'New User', email: regEmail, password: 'SecurePassword123' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/registration code sent/i);

      // Verify OTP stored in database
      const otpRecord = await OTP.findOne({ email: regEmail, purpose: 'register' });
      expect(otpRecord).not.toBeNull();
      expect(otpRecord.code).toHaveLength(6);
    });

    test('Verifying registration with incorrect OTP code returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/register/verify')
        .send({ email: regEmail, code: '000000' });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid or expired code/i);
    });

    test('Verifying registration with correct OTP code completes registration', async () => {
      const otpRecord = await OTP.findOne({ email: regEmail, purpose: 'register' });
      const validCode = otpRecord.code;

      const res = await request(app)
        .post('/api/auth/register/verify')
        .send({ email: regEmail, code: validCode });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(regEmail);

      // Verify user created in DB
      const userInDb = await User.findOne({ email: regEmail });
      expect(userInDb).not.toBeNull();
    });
  });

  // ---- RBAC (ROLE-BASED ACCESS CONTROL) ----
  describe('RBAC Access Enforcement', () => {
    test('Regular user attempting admin route (/api/admin/links) receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/links')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/admin access required/i);
    });

    test('Regular user attempting admin user management (/api/admin/users) receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/admin access required/i);
    });

    test('Admin user accessing admin route (/api/admin/links) succeeds with 200', async () => {
      const res = await request(app)
        .get('/api/admin/links')
        .set('Authorization', `Bearer ${adminUserToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ---- BROKEN OBJECT LEVEL AUTHORIZATION (BOLA / IDOR) ----
  describe('Cross-User Resource Ownership (BOLA / IDOR Prevention)', () => {
    let linkOwnedByUser1;

    beforeAll(async () => {
      linkOwnedByUser1 = await Link.create({
        title: 'User 1 Private Link',
        slug: `user1-link-${Date.now()}`,
        targetUrl: 'https://example.com/user1-secret',
        ownerEmail: regularUser.email,
        clicks: 0,
        visibility: 'private',
      });
    });

    test('User 2 attempting to modify User 1 link (PUT) is rejected with 403', async () => {
      const res = await request(app)
        .put(`/api/links/${linkOwnedByUser1._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission to edit/i);

      // Verify title was not changed
      const doc = await Link.findById(linkOwnedByUser1._id);
      expect(doc.title).toBe('User 1 Private Link');
    });

    test('User 2 attempting to delete User 1 link (DELETE) is rejected with 403', async () => {
      const res = await request(app)
        .delete(`/api/links/${linkOwnedByUser1._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission to delete/i);

      // Verify link still exists
      const doc = await Link.findById(linkOwnedByUser1._id);
      expect(doc).not.toBeNull();
    });

    test('User 2 attempting to toggle favorite on User 1 link (PATCH) is rejected with 403', async () => {
      const res = await request(app)
        .patch(`/api/links/${linkOwnedByUser1._id}/favorite`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission to modify/i);
    });
  });

  // ---- ZERO-TRUST DIRECT ACCESS ENFORCEMENT ----
  describe('Zero-Trust / Recipient-Bound Link Protection', () => {
    test('Direct access to recipient-bound link via /r/:slug is rejected with 403', async () => {
      const secureSlug = `zero-trust-${Date.now()}`;
      await Link.create({
        title: 'Zero Trust Doc',
        slug: secureSlug,
        targetUrl: 'https://example.com/classified',
        isRecipientBound: true,
        clicks: 0,
      });

      const res = await request(app).get(`/r/${secureSlug}`);
      expect(res.status).toBe(403);
      expect(res.text).toContain('requires an invitation token');
    });
  });
});
