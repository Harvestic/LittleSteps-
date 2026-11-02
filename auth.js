// auth.js - Secure authentication and session management
const crypto = require('node:crypto');
const { db } = require('./db');

// Session duration: 7 days in milliseconds
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const newHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const bufA = Buffer.from(hash, 'hex');
  const bufB = Buffer.from(newHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession(parentId) {
  const token = generateToken();
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  const stmt = db.prepare(`
    INSERT INTO sessions (token, parent_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(token, parentId, expiresAt, now);

  return { token, expiresAt };
}

function getSessionParent(token) {
  if (!token) return null;
  const now = Date.now();
  const stmt = db.prepare(`
    SELECT s.token, s.expires_at, p.id, p.name, p.email, p.consent_given, p.created_at
    FROM sessions s
    JOIN parents p ON s.parent_id = p.id
    WHERE s.token = ? AND s.expires_at > ?
  `);
  return stmt.get(token, now) || null;
}

function destroySession(token) {
  if (!token) return;
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  stmt.run(token);
}

function cleanExpiredSessions() {
  const now = Date.now();
  const stmt = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  stmt.run(now);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  createSession,
  getSessionParent,
  destroySession,
  cleanExpiredSessions
};
