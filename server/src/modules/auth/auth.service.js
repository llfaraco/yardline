import crypto from 'node:crypto';
import { db } from '../../db/database.js';

// Utilitários de Hash Criptográfico usando scrypt nativo
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Map em memória para sessões ativas (para produção: Redis ou tabela sessions)
const activeSessions = new Map(); // token -> { userId, expiresAt }

export const authService = {
  register({ email, password, displayName, timezone = 'America/Sao_Paulo' }) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      throw new Error('Já existe uma conta cadastrada com este endereço de e-mail.');
    }

    const userId = 'usr_' + crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, locale, timezone, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pt-BR', ?, ?, ?)
    `);

    insertUser.run(userId, email.toLowerCase().trim(), passwordHash, displayName.trim(), timezone, now, now);

    // Registrar log de auditoria
    db.prepare(`
      INSERT INTO audit_events (id, user_id, action, entity_type, entity_id, created_at)
      VALUES (?, ?, 'USER_REGISTERED', 'user', ?, ?)
    `).run('aud_' + crypto.randomUUID(), userId, userId, now);

    return this.createSession(userId);
  },

  login({ email, password }) {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email.toLowerCase().trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    return this.createSession(user.id);
  },

  createSession(userId) {
    const token = 'yl_sess_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 dias
    activeSessions.set(token, { userId, expiresAt });

    const user = db.prepare('SELECT id, email, display_name, locale, timezone, created_at FROM users WHERE id = ?').get(userId);
    return { token, user, expiresAt };
  },

  validateToken(token) {
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return null;
    }
    return db.prepare('SELECT id, email, display_name, locale, timezone, created_at FROM users WHERE id = ? AND deleted_at IS NULL').get(session.userId);
  },

  logout(token) {
    if (token) {
      activeSessions.delete(token);
    }
    return true;
  }
};
