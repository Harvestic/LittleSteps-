// server.js - High-performance HTTP API and Static Server for LittleSteps
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const url = require('node:url');
const crypto = require('node:crypto');

const { db } = require('./db');
const {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionParent,
  destroySession
} = require('./auth');
const {
  getRewardStatus,
  claimDailyReward,
  getISTDate
} = require('./reward_service');
const {
  COMMON_FOODS,
  NUTRITION_GUIDANCE,
  logMeal,
  updateMeal,
  deleteMeal,
  getMeals,
  logWater,
  getWaterLogs,
  getWeeklySummary
} = require('./nutrition_service');

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) { // 2MB limit
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// Extract authenticated parent from Bearer token or cookie
function getAuthenticatedParent(req) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'session_token') {
        token = v;
        break;
      }
    }
  }

  if (!token) return null;
  return getSessionParent(token);
}

// Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  try {
    // ==========================================
    // API: AUTHENTICATION & PARENT PROFILE
    // ==========================================
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { name, email, password, consentGiven } = body;

      if (!name || !email || !password) {
        return sendJSON(res, 400, { error: 'Name, email, and password are required.' });
      }
      if (password.length < 6) {
        return sendJSON(res, 400, { error: 'Password must be at least 6 characters long.' });
      }
      if (!consentGiven) {
        return sendJSON(res, 400, { error: 'Parental consent is required to manage early childhood records.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM parents WHERE email = ?').get(normalizedEmail);
      if (existing) {
        return sendJSON(res, 409, { error: 'An account with this email already exists. Please log in.' });
      }

      const { hash, salt } = hashPassword(password);
      const parentId = crypto.randomUUID();
      const now = Date.now();

      const insertStmt = db.prepare(`
        INSERT INTO parents (id, name, email, password_hash, salt, consent_given, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(parentId, name.trim(), normalizedEmail, hash, salt, 1, now, now);

      // Create session & initial reward status
      const { token, expiresAt } = createSession(parentId);
      const rewardStatus = getRewardStatus(parentId);

      return sendJSON(res, 201, {
        message: 'Account created successfully.',
        token,
        expiresAt,
        parent: { id: parentId, name: name.trim(), email: normalizedEmail },
        rewardStatus
      });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return sendJSON(res, 400, { error: 'Email and password are required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const parent = db.prepare('SELECT * FROM parents WHERE email = ?').get(normalizedEmail);
      if (!parent) {
        return sendJSON(res, 401, { error: 'Invalid email or password.' });
      }

      const isValid = verifyPassword(password, parent.password_hash, parent.salt);
      if (!isValid) {
        return sendJSON(res, 401, { error: 'Invalid email or password.' });
      }

      const { token, expiresAt } = createSession(parent.id);
      const rewardStatus = getRewardStatus(parent.id);

      return sendJSON(res, 200, {
        message: 'Login successful.',
        token,
        expiresAt,
        parent: { id: parent.id, name: parent.name, email: parent.email },
        rewardStatus
      });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        destroySession(token);
      }
      return sendJSON(res, 200, { message: 'Logged out successfully.' });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) {
        return sendJSON(res, 401, { error: 'Unauthorized session.' });
      }
      const rewardStatus = getRewardStatus(parent.id);
      return sendJSON(res, 200, { parent, rewardStatus });
    }

    // Password reset (Step 1: Request reset code)
    if (pathname === '/api/auth/forgot-password' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { email } = body;
      if (!email) {
        return sendJSON(res, 400, { error: 'Email is required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const parent = db.prepare('SELECT id FROM parents WHERE email = ?').get(normalizedEmail);
      if (!parent) {
        // Return friendly message even if email doesn't exist for privacy
        return sendJSON(res, 200, {
          message: 'If the email is registered, a 6-digit reset code has been generated.',
          demoCode: null
        });
      }

      // Generate 6-digit code valid for 15 minutes
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Date.now() + 15 * 60 * 1000;

      db.prepare('UPDATE parents SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
        .run(code, expires, parent.id);

      return sendJSON(res, 200, {
        message: 'Password reset code generated. In offline/community mode, use the code below:',
        resetCode: code
      });
    }

    // Password reset (Step 2: Submit code and new password)
    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { email, resetCode, newPassword } = body;

      if (!email || !resetCode || !newPassword) {
        return sendJSON(res, 400, { error: 'Email, reset code, and new password are required.' });
      }
      if (newPassword.length < 6) {
        return sendJSON(res, 400, { error: 'Password must be at least 6 characters.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const parent = db.prepare('SELECT * FROM parents WHERE email = ?').get(normalizedEmail);
      if (!parent) {
        return sendJSON(res, 400, { error: 'Invalid reset request.' });
      }

      const now = Date.now();
      if (parent.reset_token !== resetCode.trim() || !parent.reset_token_expires || parent.reset_token_expires < now) {
        return sendJSON(res, 400, { error: 'Invalid or expired reset code. Please request a new one.' });
      }

      const { hash, salt } = hashPassword(newPassword);
      db.prepare(`
        UPDATE parents 
        SET password_hash = ?, salt = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ?
        WHERE id = ?
      `).run(hash, salt, now, parent.id);

      // Invalidate existing sessions for security
      db.prepare('DELETE FROM sessions WHERE parent_id = ?').run(parent.id);

      return sendJSON(res, 200, { message: 'Password updated successfully! Please log in with your new password.' });
    }

    // ==========================================
    // API: CHILD PROFILES (Private per parent)
    // ==========================================
    if (pathname === '/api/children' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const children = db.prepare('SELECT * FROM children WHERE parent_id = ? ORDER BY created_at ASC').all(parent.id);
      return sendJSON(res, 200, { children });
    }

    if (pathname === '/api/children' && method === 'POST') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      const { nickname, age } = body;

      if (!nickname || !age) {
        return sendJSON(res, 400, { error: 'Child nickname and age are required.' });
      }
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 12) {
        return sendJSON(res, 400, { error: 'Please enter a valid age (e.g. 3, 4, or 5).' });
      }

      const childId = crypto.randomUUID();
      const now = Date.now();

      db.prepare(`
        INSERT INTO children (id, parent_id, nickname, age, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(childId, parent.id, nickname.trim(), parsedAge, now, now);

      return sendJSON(res, 201, {
        message: 'Child profile added.',
        child: { id: childId, parent_id: parent.id, nickname: nickname.trim(), age: parsedAge }
      });
    }

    if (pathname.startsWith('/api/children/') && method === 'PUT') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const childId = pathname.split('/')[3];
      const body = await parseRequestBody(req);
      const { nickname, age } = body;

      const child = db.prepare('SELECT * FROM children WHERE id = ? AND parent_id = ?').get(childId, parent.id);
      if (!child) return sendJSON(res, 404, { error: 'Child profile not found.' });

      const newNickname = nickname ? nickname.trim() : child.nickname;
      const newAge = age ? parseInt(age, 10) : child.age;
      const now = Date.now();

      db.prepare(`
        UPDATE children SET nickname = ?, age = ?, updated_at = ?
        WHERE id = ? AND parent_id = ?
      `).run(newNickname, newAge, now, childId, parent.id);

      return sendJSON(res, 200, {
        message: 'Child profile updated.',
        child: { id: childId, nickname: newNickname, age: newAge }
      });
    }

    if (pathname.startsWith('/api/children/') && method === 'DELETE') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const childId = pathname.split('/')[3];
      const stmt = db.prepare('DELETE FROM children WHERE id = ? AND parent_id = ?');
      const result = stmt.run(childId, parent.id);

      if (result.changes === 0) return sendJSON(res, 404, { error: 'Child profile not found.' });
      return sendJSON(res, 200, { message: 'Child profile deleted successfully.' });
    }

    // ==========================================
    // API: DAILY LOGIN REWARDS (Asia/Kolkata IST)
    // ==========================================
    if (pathname === '/api/rewards/status' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const status = getRewardStatus(parent.id);
      return sendJSON(res, 200, status);
    }

    if (pathname === '/api/rewards/claim' && method === 'POST') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const result = claimDailyReward(parent.id);
      return sendJSON(res, result.success ? 200 : 409, result);
    }

    // ==========================================
    // API: NUTRITION & WATER LOGGING
    // ==========================================
    if (pathname === '/api/nutrition' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const { childId, startDate, endDate } = parsedUrl.query;
      if (!childId) return sendJSON(res, 400, { error: 'childId query param is required.' });

      try {
        const meals = getMeals(parent.id, childId, startDate, endDate);
        return sendJSON(res, 200, { meals });
      } catch (err) {
        return sendJSON(res, 403, { error: err.message });
      }
    }

    if (pathname === '/api/nutrition' && method === 'POST') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      try {
        const meal = logMeal(parent.id, body);
        return sendJSON(res, 201, { message: 'Meal logged successfully.', meal });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (pathname.startsWith('/api/nutrition/') && method === 'PUT') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const mealId = pathname.split('/')[3];
      const body = await parseRequestBody(req);

      try {
        const updated = updateMeal(parent.id, mealId, body);
        return sendJSON(res, 200, { message: 'Meal updated.', updated });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (pathname.startsWith('/api/nutrition/') && method === 'DELETE') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const mealId = pathname.split('/')[3];
      try {
        const result = deleteMeal(parent.id, mealId);
        return sendJSON(res, 200, result);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/nutrition/summary' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const { childId, targetDate } = parsedUrl.query;
      if (!childId) return sendJSON(res, 400, { error: 'childId is required.' });

      const dateStr = targetDate || getISTDate();
      try {
        const summary = getWeeklySummary(parent.id, childId, dateStr);
        return sendJSON(res, 200, summary);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/nutrition/reference-foods' && method === 'GET') {
      return sendJSON(res, 200, { foods: COMMON_FOODS, guidance: NUTRITION_GUIDANCE });
    }

    // Water Log
    if (pathname === '/api/water' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const { childId, startDate, endDate } = parsedUrl.query;
      if (!childId) return sendJSON(res, 400, { error: 'childId is required.' });

      try {
        const water = getWaterLogs(parent.id, childId, startDate, endDate);
        return sendJSON(res, 200, { water });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/water' && method === 'POST') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      try {
        const log = logWater(parent.id, body);
        return sendJSON(res, 200, { message: 'Water logged.', log });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    // ==========================================
    // API: EDUCATIONAL PROGRESS
    // ==========================================
    if (pathname === '/api/learning/progress' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const { childId } = parsedUrl.query;
      if (!childId) return sendJSON(res, 400, { error: 'childId is required.' });

      const rows = db.prepare(`
        SELECT * FROM learning_progress
        WHERE parent_id = ? AND child_id = ?
        ORDER BY completed_at DESC
      `).all(parent.id, childId);

      return sendJSON(res, 200, { activities: rows });
    }

    if (pathname === '/api/learning/progress' && method === 'POST') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      const { childId, activityId, activityType, title, score, starsEarned } = body;

      const child = db.prepare('SELECT id FROM children WHERE id = ? AND parent_id = ?').get(childId, parent.id);
      if (!child) return sendJSON(res, 404, { error: 'Child not found.' });

      const id = crypto.randomUUID();
      const now = Date.now();
      const stars = parseInt(starsEarned || 1, 10);

      db.prepare(`
        INSERT INTO learning_progress (id, parent_id, child_id, activity_id, activity_type, title, score, stars_earned, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, parent.id, childId, activityId, activityType, title, score || 100, stars, now);

      return sendJSON(res, 201, { message: 'Activity progress recorded.', id, starsEarned: stars });
    }

    // ==========================================
    // API: PRIVACY & DATA RIGHTS (Export & Deletion)
    // ==========================================
    if (pathname === '/api/privacy/export' && method === 'GET') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const children = db.prepare('SELECT id, nickname, age, created_at FROM children WHERE parent_id = ?').all(parent.id);
      const meals = db.prepare('SELECT * FROM nutrition_logs WHERE parent_id = ?').all(parent.id);
      const water = db.prepare('SELECT * FROM water_logs WHERE parent_id = ?').all(parent.id);
      const learning = db.prepare('SELECT * FROM learning_progress WHERE parent_id = ?').all(parent.id);
      const rewards = db.prepare('SELECT * FROM reward_claims WHERE parent_id = ?').all(parent.id);
      const rewardStatus = db.prepare('SELECT * FROM reward_status WHERE parent_id = ?').get(parent.id);

      return sendJSON(res, 200, {
        exportDate: new Date().toISOString(),
        parent: { id: parent.id, name: parent.name, email: parent.email },
        children,
        meals: meals.map(m => ({ ...m, foods_offered: JSON.parse(m.foods_offered_json), foods_eaten: JSON.parse(m.foods_eaten_json) })),
        water,
        learning,
        rewards,
        rewardStatus: rewardStatus ? { ...rewardStatus, badges: JSON.parse(rewardStatus.badges_json), certs: JSON.parse(rewardStatus.certificates_json) } : null
      });
    }

    if (pathname === '/api/privacy/delete-request' && method === 'POST') {
      const parent = getAuthenticatedParent(req);
      if (!parent) return sendJSON(res, 401, { error: 'Unauthorized' });

      const body = await parseRequestBody(req);
      const { deleteType, childId } = body; // 'child' or 'entire_account'

      const now = Date.now();
      const reqId = crypto.randomUUID();

      if (deleteType === 'child' && childId) {
        db.prepare('DELETE FROM children WHERE id = ? AND parent_id = ?').run(childId, parent.id);
        db.prepare(`
          INSERT INTO data_deletion_requests (id, parent_id, child_id, details, status, requested_at)
          VALUES (?, ?, ?, 'Child profile and associated nutrition/learning records purged', 'completed', ?)
        `).run(reqId, parent.id, childId, now);

        return sendJSON(res, 200, { message: 'Child profile and all associated data permanently erased.' });
      }

      if (deleteType === 'entire_account') {
        // Cascade delete parent
        db.prepare(`
          INSERT INTO data_deletion_requests (id, parent_id, child_id, details, status, requested_at)
          VALUES (?, ?, NULL, 'Complete family account erasure request fulfilled', 'completed', ?)
        `).run(reqId, parent.id, now);

        db.prepare('DELETE FROM parents WHERE id = ?').run(parent.id);

        return sendJSON(res, 200, { message: 'Your family account and all records have been completely and permanently erased.' });
      }

      return sendJSON(res, 400, { error: 'Invalid delete request specification.' });
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Access Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // If not found, serve index.html for SPA client-side routing
        const spaIndex = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(spaIndex, (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('File Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      fs.createReadStream(filePath).pipe(res);
    });

  } catch (err) {
    console.error('Server error handling request:', err);
    sendJSON(res, 500, { error: 'Internal Server Error', details: err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LittleSteps server listening on http://localhost:${PORT}`);
});

module.exports = server;
