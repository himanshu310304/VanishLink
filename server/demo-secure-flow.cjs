const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

const API_BASE = 'http://localhost:5050/api';
const FRONTEND_URL = 'http://localhost:5050'; // Using the backend redirect for secure links

async function runDemo() {
  try {
    console.log('🚀 Starting Secure Sharing Live Demo...\n');

    // 1. Create a test admin account to get an auth token instantly
    console.log('1️⃣ Authenticating test user...');
    const authRes = await axios.post(`${API_BASE}/auth/register/initiate`, {
      name: 'Demo Admin',
      email: `demo-admin-${Date.now()}@vanishlink.com`,
      password: 'password123',
      role: 'admin',
      adminSecurityKey: process.env.ADMIN_SECURITY_KEY
    });

    const token = authRes.data.token;
    console.log('✅ Authenticated successfully.\n');

    // 2. Create a Secure Link
    console.log('2️⃣ Creating a Secure Link bound to a specific recipient...');
    const linkRes = await axios.post(`${API_BASE}/links`, {
      url: 'https://news.ycombinator.com', // The secret destination
      title: 'Top Secret HN Document',
      secureSharing: {
        enabled: true,
        requireVerification: true,
        maxDevices: 1,
        requiredVerification: ['email_otp'],
        freezeOnSuspiciousActivity: true
      }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const link = linkRes.data;
    console.log(`✅ Secure Link Created! ID: ${link._id}`);
    console.log(`🔗 Standard URL (Blocked for unauthorized users): ${FRONTEND_URL}/r/${link.slug}\n`);

    // 3. Add an authorized recipient
    console.log('3️⃣ Authorizing a recipient (test-recipient@example.com)...');
    const recipientRes = await axios.post(`${API_BASE}/secure/links/${link._id}/recipients`, {
      email: 'test-recipient@example.com',
      name: 'Test Recipient',
      notes: 'Demo purpose'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const recipient = recipientRes.data.recipient;
    console.log('✅ Recipient added and unique access token generated.');

    // 4. Generate the final access URL that the recipient would receive in their email
    const accessUrl = `http://localhost:5173/secure/${link.slug}?token=${recipient.accessTokens[0].token}`;

    console.log('\n=============================================================');
    console.log('🎉 LIVE DEMO READY!');
    console.log('=============================================================');
    console.log('To experience the secure verification flow exactly as the recipient would:');
    console.log('\n1. Open a completely NEW INCOGNITO WINDOW in your browser.');
    console.log('2. Paste this exact URL:');
    console.log(`\n   ${accessUrl}\n`);
    console.log('3. Enter the email: test-recipient@example.com');
    console.log('4. Look at the terminal where `node index` is running! The OTP code will be printed there.');
    console.log('5. Enter the OTP in the browser.');
    console.log('6. Watch as your device fingerprint is captured and you are securely redirected!');
    console.log('=============================================================\n');

  } catch (error) {
    console.error('❌ Demo failed:', error.response?.data?.message || error.message);
  }
}

runDemo();
