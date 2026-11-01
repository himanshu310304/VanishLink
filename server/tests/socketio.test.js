// server/tests/socketio.test.js
const ioClient = require('socket.io-client');
const http = require('http');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vanishlink_test';
const JWT_SECRET = process.env.JWT_SECRET || 'VanishLink2025SecureKey!@$%^&*()_.+';

let serverModule;
let app;
let server;
let Link;
let port;
let socketServerUrl;

beforeAll((done) => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = MONGO_URI;

  serverModule = require('../index');
  app = serverModule.app;
  server = serverModule.server;
  Link = require('../models/Link');

  // Listen on ephemeral port for tests
  server.listen(0, () => {
    port = server.address().port;
    socketServerUrl = `http://localhost:${port}`;
    done();
  });
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Phase 3 - Real-Time Socket.IO Tests', () => {
  test('Socket client connects successfully to server', (done) => {
    const client = ioClient(socketServerUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });
  });

  test('admin_new_click event is broadcast on link access', (done) => {
    const client = ioClient(socketServerUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    client.on('connect', async () => {
      const slug = `socket-admin-${Date.now()}`;
      await Link.create({
        title: 'Socket Admin Test',
        slug,
        targetUrl: 'https://example.com/socket-admin',
        clicks: 0,
        status: 'active',
        showPreview: false,
      });

      client.on('admin_new_click', (data) => {
        expect(data.slug).toBe(slug);
        expect(data.clicks).toBe(1);
        client.disconnect();
        done();
      });

      // Trigger link click
      await request(app).get(`/r/${slug}`);
    });
  });

  test('user_new_click event is received by authorized subscriber with valid JWT token', (done) => {
    const targetUserId = new mongoose.Types.ObjectId();
    const validToken = jwt.sign(
      { sub: targetUserId.toString(), email: 'valid@example.com', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const client = ioClient(socketServerUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    client.on('connect', async () => {
      // Join user room with valid credentials
      client.emit('join-user-room', { userId: targetUserId.toString(), token: validToken });

      const slug = `socket-user-${Date.now()}`;
      await Link.create({
        title: 'Socket User Room Test',
        slug,
        targetUrl: 'https://example.com/socket-user',
        clicks: 0,
        createdBy: targetUserId,
        status: 'active',
        showPreview: false,
      });

      client.on('user_new_click', (data) => {
        expect(data.slug).toBe(slug);
        expect(data.clicks).toBe(1);
        client.disconnect();
        done();
      });

      setTimeout(async () => {
        await request(app).get(`/r/${slug}`);
      }, 50);
    });
  });

  test('Security Hardening: Unauthorized client attempting to join arbitrary user room is rejected with auth_error', (done) => {
    const victimUserId = new mongoose.Types.ObjectId();
    const attackerClient = ioClient(socketServerUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    attackerClient.on('connect', async () => {
      // Attacker attempts to join victim room with NO token
      attackerClient.emit('join-user-room', victimUserId.toString());

      attackerClient.on('auth_error', (data) => {
        expect(data.message).toMatch(/Authentication required/i);
        attackerClient.disconnect();
        done();
      });
    });
  });
});
