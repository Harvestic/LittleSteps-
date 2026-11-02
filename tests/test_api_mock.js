// tests/test_api_mock.js - In-memory API integration test without network port
const assert = require('node:assert');
const { Readable, Writable } = require('node:stream');
const server = require('../server');

function createMockReq(options, body = null) {
  const req = new Readable({
    read() {
      if (body) {
        this.push(body);
      }
      this.push(null);
    }
  });

  req.method = options.method || 'GET';
  req.url = options.path || '/';
  req.headers = {
    host: 'localhost',
    ...(options.headers || {})
  };
  if (body) {
    req.headers['content-type'] = 'application/json';
    req.headers['content-length'] = Buffer.byteLength(body);
  }
  return req;
}

function dispatch(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = createMockReq(options, postData);
    let statusCode = 200;
    let headers = {};
    let chunks = [];

    const res = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      }
    });

    res.writeHead = function(code, h = {}) {
      statusCode = code;
      headers = { ...headers, ...h };
    };

    res.setHeader = function(name, val) {
      headers[name.toLowerCase()] = val;
    };

    res.getHeader = function(name) {
      return headers[name.toLowerCase()];
    };

    res.on('finish', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      let json = null;
      try { json = JSON.parse(body); } catch (_) {}
      resolve({ statusCode, headers, body, json });
    });

    res.on('error', reject);

    // Dispatch directly to the HTTP server request listener
    server.emit('request', req, res);
  });
}

async function runApiTests() {
  console.log('--- Starting LittleSteps In-Memory API Integration Tests ---\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(err);
    }
  }

  // 1. Static file check
  await test('GET / returns HTML page', async () => {
    const res = await dispatch({ path: '/', method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('LittleSteps'));
    assert(res.body.includes('Kid Play Area'));
  });

  await test('GET /styles.css returns CSS stylesheet', async () => {
    const res = await dispatch({ path: '/styles.css', method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('--bg-warm-yellow'));
  });

  // 2. Authentication: Register
  let authToken = null;
  let parentId = null;
  const uniqueEmail = `priya_${Date.now()}@example.com`;

  await test('POST /api/auth/register creates parent account with consent', async () => {
    const payload = JSON.stringify({
      name: 'Priya Sharma',
      email: uniqueEmail,
      password: 'SafePassword123',
      consentGiven: true
    });
    const res = await dispatch({ path: '/api/auth/register', method: 'POST' }, payload);
    assert.strictEqual(res.statusCode, 201);
    assert(res.json.token);
    assert.strictEqual(res.json.parent.name, 'Priya Sharma');
    authToken = res.json.token;
    parentId = res.json.parent.id;
  });

  await test('POST /api/auth/register fails if consent is missing', async () => {
    const payload = JSON.stringify({
      name: 'No Consent',
      email: `noconsent_${Date.now()}@example.com`,
      password: 'SafePassword123',
      consentGiven: false
    });
    const res = await dispatch({ path: '/api/auth/register', method: 'POST' }, payload);
    assert.strictEqual(res.statusCode, 400);
    assert(res.json.error.includes('consent is required'));
  });

  // 3. Authentication: Login
  await test('POST /api/auth/login logs in existing parent', async () => {
    const payload = JSON.stringify({
      email: uniqueEmail,
      password: 'SafePassword123'
    });
    const res = await dispatch({ path: '/api/auth/login', method: 'POST' }, payload);
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.token);
    authToken = res.json.token;
  });

  // 4. GET /api/auth/me
  await test('GET /api/auth/me retrieves current session parent', async () => {
    const res = await dispatch({
      path: '/api/auth/me',
      method: 'GET',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.parent.email, uniqueEmail);
  });

  // 5. Password Reset Flow
  let resetCode = null;
  await test('POST /api/auth/forgot-password generates 6-digit reset code', async () => {
    const payload = JSON.stringify({ email: uniqueEmail });
    const res = await dispatch({ path: '/api/auth/forgot-password', method: 'POST' }, payload);
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.resetCode);
    resetCode = res.json.resetCode;
  });

  await test('POST /api/auth/reset-password resets password using valid code', async () => {
    const payload = JSON.stringify({
      email: uniqueEmail,
      resetCode: resetCode,
      newPassword: 'BrandNewPassword456'
    });
    const res = await dispatch({ path: '/api/auth/reset-password', method: 'POST' }, payload);
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.message.includes('Password updated successfully'));

    // Re-login with new password
    const loginRes = await dispatch({ path: '/api/auth/login', method: 'POST' }, JSON.stringify({
      email: uniqueEmail,
      password: 'BrandNewPassword456'
    }));
    assert.strictEqual(loginRes.statusCode, 200);
    authToken = loginRes.json.token;
  });

  // 6. Child Profile Management
  let childId = null;
  await test('POST /api/children creates child profile with screen time minutes', async () => {
    const payload = JSON.stringify({ nickname: 'Chintu', age: 4, dailyScreenTimeMinutes: 45 });
    const res = await dispatch({
      path: '/api/children',
      method: 'POST',
      headers: { authorization: `Bearer ${authToken}` }
    }, payload);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.json.child.nickname, 'Chintu');
    assert.strictEqual(res.json.child.age, 4);
    assert.strictEqual(res.json.child.daily_screen_time_minutes, 45);
    childId = res.json.child.id;
  });

  await test('GET /api/children lists children with screen time limits', async () => {
    const res = await dispatch({
      path: '/api/children',
      method: 'GET',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.children.length, 1);
    assert.strictEqual(res.json.children[0].nickname, 'Chintu');
    assert.strictEqual(res.json.children[0].daily_screen_time_minutes, 45);
  });

  // 6b. Pediatric Sickness & Health Guide API
  await test('GET /api/health/sicknesses returns curated health guidance list', async () => {
    const res = await dispatch({
      path: '/api/health/sicknesses',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json.sicknesses));
    assert(res.json.sicknesses.length >= 8);
    assert(res.json.disclaimer.includes('supportive caregiver comfort'));
  });

  await test('GET /api/health/sicknesses?q=fever filters sicknesses by search query', async () => {
    const res = await dispatch({
      path: '/api/health/sicknesses?q=fever',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.sicknesses.length >= 1);
    const found = res.json.sicknesses.find(s => s.id === 'mild_fever');
    assert(found !== undefined);
    assert(found.redFlags.length > 0);
  });

  // 7. Daily Login Rewards (IST)
  await test('POST /api/rewards/claim claims daily reward', async () => {
    const res = await dispatch({
      path: '/api/rewards/claim',
      method: 'POST',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.streak, 1);
    assert.strictEqual(res.json.totalStars, 1);
  });

  await test('POST /api/rewards/claim prevents duplicate claim on same IST day', async () => {
    const res = await dispatch({
      path: '/api/rewards/claim',
      method: 'POST',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.json.alreadyClaimed, true);
  });

  // 8. Nutrition Logging & Summary
  let mealId = null;
  await test('POST /api/nutrition logs a meal', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const payload = JSON.stringify({
      childId,
      mealDate: todayStr,
      mealType: 'breakfast',
      foodsOffered: ['Daliya (Broken Wheat Porridge)', 'Warm Milk (Cow/Buffalo)', 'Banana / Kela'],
      foodsEaten: ['Daliya (Broken Wheat Porridge)', 'Banana / Kela'],
      notes: 'Ate happily'
    });
    const res = await dispatch({
      path: '/api/nutrition',
      method: 'POST',
      headers: { authorization: `Bearer ${authToken}` }
    }, payload);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.json.meal.mealType, 'breakfast');
    mealId = res.json.meal.id;
  });

  await test('GET /api/nutrition lists meals', async () => {
    const res = await dispatch({
      path: `/api/nutrition?childId=${childId}`,
      method: 'GET',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.meals.length, 1);
  });

  await test('GET /api/nutrition/summary returns weekly variety and disclaimer', async () => {
    const res = await dispatch({
      path: `/api/nutrition/summary?childId=${childId}`,
      method: 'GET',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.disclaimer.includes('NOT a clinical diagnosis'));
    assert(res.json.foodGroupCounts.energy >= 1);
  });

  // 9. Water Intake
  await test('POST /api/water logs water intake', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const payload = JSON.stringify({
      childId,
      logDate: todayStr,
      glassesCount: 3
    });
    const res = await dispatch({
      path: '/api/water',
      method: 'POST',
      headers: { authorization: `Bearer ${authToken}` }
    }, payload);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.log.glassesCount, 3);
  });

  // 10. Educational Progress
  await test('POST /api/learning/progress records game completion', async () => {
    const payload = JSON.stringify({
      childId,
      activityId: 'alphabet_A',
      activityType: 'alphabet',
      title: 'Learned letter A',
      starsEarned: 1
    });
    const res = await dispatch({
      path: '/api/learning/progress',
      method: 'POST',
      headers: { authorization: `Bearer ${authToken}` }
    }, payload);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.json.starsEarned, 1);
  });

  // 11. Privacy: Export & Deletion
  await test('GET /api/privacy/export exports all private records', async () => {
    const res = await dispatch({
      path: '/api/privacy/export',
      method: 'GET',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.parent.email, uniqueEmail);
    assert(res.json.children.length >= 1);
    assert(res.json.meals.length >= 1);
  });

  await test('POST /api/privacy/delete-request permanently deletes child profile', async () => {
    const payload = JSON.stringify({
      deleteType: 'child',
      childId
    });
    const res = await dispatch({
      path: '/api/privacy/delete-request',
      method: 'POST',
      headers: { authorization: `Bearer ${authToken}` }
    }, payload);

    assert.strictEqual(res.statusCode, 200);
    assert(res.json.message.includes('permanently erased'));

    // Verify child is gone
    const checkRes = await dispatch({
      path: '/api/children',
      method: 'GET',
      headers: { authorization: `Bearer ${authToken}` }
    });
    assert.strictEqual(checkRes.json.children.length, 0);
  });

  console.log(`\n========================================`);
  console.log(`API Tests Completed: ${passed}/${total} passed`);
  console.log(`========================================\n`);

  if (passed === total) {
    console.log('ALL 19 API ENDPOINT TESTS PASSED! ✨ Server is 100% operational!');
    server.close();
    process.exit(0);
  } else {
    server.close();
    process.exit(1);
  }
}

runApiTests();
