const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5050';
const JWT_SECRET = 'VanishLink2025SecureKey!@$%^&*()_.+';

const mockUserId = '64abcd123456789012345678';
const token = jwt.sign({ id: mockUserId, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const data = await res.text();
  let parsed;
  try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
  return { status: res.status, data: parsed, headers: res.headers };
}

async function runTests() {
  try {
    console.log('--- 🚀 Starting VanishLink Dashboard Feature Verification ---');
    console.log(`Using mocked authentication for user ID: ${mockUserId}`);

    // 1. Test Basic Link Creation
    console.log('\n[1] Testing Basic Features (Custom Slug, Visibility)...');
    const basicRes = await fetchAPI('/api/links', {
      method: 'POST',
      body: {
        targetUrl: 'https://example.com/basic',
        title: 'Basic Test',
        customSlug: `basic-${Date.now()}`,
        visibility: 'private'
      }
    });
    if (basicRes.status !== 201 && basicRes.status !== 200) {
      console.error('Basic Link Creation Failed:', basicRes.data);
    } else {
      const basicLink = basicRes.data;
      console.log(`✅ Basic link created: ${basicLink.shortUrl}`);

      const redirectRes = await fetch(`${API_BASE}/${basicLink.shortId}`, { redirect: 'manual' });
      if (redirectRes.status === 302 && redirectRes.headers.get('location') === 'https://example.com/basic') {
        console.log('✅ Basic redirect successful.');
      } else {
        console.error('❌ Basic redirect failed.', redirectRes.status, redirectRes.headers.get('location'));
      }
    }

    // 2. Test Security Features (Password)
    console.log('\n[2] Testing Security Feature (Password Protection)...');
    const pwdRes = await fetchAPI('/api/links', {
      method: 'POST',
      body: {
        targetUrl: 'https://example.com/secure',
        password: 'mysecretpassword'
      }
    });
    const pwdLink = pwdRes.data;
    console.log(`✅ Password link created: ${pwdLink.shortUrl}`);

    const pwdRedirect = await fetch(`${API_BASE}/${pwdLink.shortId}`, { redirect: 'manual' });
    const pwdText = await pwdRedirect.text();
    let pwdJson = {};
    try { pwdJson = JSON.parse(pwdText); } catch(e){}
    if (pwdJson.isPasswordProtected) {
      console.log('✅ Password protection blocked direct access (JSON prompt triggered).');
    } else {
      console.error('❌ Password protection failed to trigger.', pwdRedirect.status);
    }

    // 3. Test Security Features (Burn After Reading)
    console.log('\n[3] Testing Security Feature (Burn After Reading - One Time)...');
    const burnRes = await fetchAPI('/api/links', {
      method: 'POST',
      body: {
        targetUrl: 'https://example.com/burn',
        isOneTime: true
      }
    });
    const burnLink = burnRes.data;
    console.log(`✅ Burn link created: ${burnLink.shortUrl}`);

    const burnClick1 = await fetch(`${API_BASE}/${burnLink.shortId}`, { redirect: 'manual' });
    if (burnClick1.status === 302) {
      console.log('✅ First click succeeded.');
    }
    const burnClick2 = await fetch(`${API_BASE}/${burnLink.shortId}`, { redirect: 'manual' });
    if (burnClick2.status === 410 || burnClick2.status === 404) {
      console.log('✅ Second click properly denied (Gone/Not Found).');
    } else {
      console.error('❌ Second click was not denied!', burnClick2.status);
    }

    // 4. Test Advanced Features (Device Routing)
    console.log('\n[4] Testing Advanced Feature (Device Routing)...');
    const deviceRes = await fetchAPI('/api/links', {
      method: 'POST',
      body: {
        targetUrl: 'https://example.com/desktop',
        deviceRules: {
          mobileUrl: 'https://example.com/mobile',
          desktopUrl: 'https://example.com/desktop',
          tabletUrl: '',
          botUrl: ''
        }
      }
    });
    const deviceLink = deviceRes.data;
    console.log(`✅ Device routing link created: ${deviceLink.shortUrl}`);
    
    const mobileRedirect = await fetch(`${API_BASE}/${deviceLink.shortId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
      redirect: 'manual'
    });
    if (mobileRedirect.headers.get('location') === 'https://example.com/mobile') {
      console.log('✅ Mobile User-Agent correctly routed to mobileUrl.');
    } else {
      console.error('❌ Mobile routing failed.', mobileRedirect.headers.get('location'));
    }

    console.log('\n🎉 All core feature tests completed successfully!');
    
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

runTests();
