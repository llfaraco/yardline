import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'yardline.db');

export const db = new DatabaseSync(DB_PATH);

if (typeof db.transaction !== 'function') {
  db.transaction = (fn) => (...args) => {
    db.exec('BEGIN');
    try {
      const res = fn(...args);
      db.exec('COMMIT');
      return res;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    }
  };
}

// Ativar busy_timeout imediatamente, chaves estrangeiras e modo WAL
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA foreign_keys = ON;');
try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch {}

export function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  
  // Seed initial plans if empty
  seedInitialPlans();
  console.log('✅ [Database] Banco de dados inicializado com sucesso em:', DB_PATH);
}

function seedInitialPlans() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM plans');
  const { count } = countStmt.get();
  if (count === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO plans (id, code, name, description, price_cents, currency, interval, features_json, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertPlan.run(
      'plan-free',
      'FREE',
      'Free Draft Scout',
      'Acesso básico a notícias NFL e catálogo de atletas',
      0,
      'BRL',
      'month',
      JSON.stringify(['Portal de notícias', 'Catálogo de jogadores', 'Visualização de elenco'])
    );

    insertPlan.run(
      'plan-pro',
      'PRO',
      'Pro Head Coach',
      'Command Center tático, Trade Analyzer, Waiver Assistant e VBD',
      2990,
      'BRL',
      'month',
      JSON.stringify(['Tudo do Free', 'Command Center ao vivo', 'Trade Hub & VORP', 'Smart Waiver & FAAB', 'Recomendações Start/Sit'])
    );

    insertPlan.run(
      'plan-allpro',
      'ALL_PRO',
      'All-Pro General Manager',
      'Acesso irrestrito a múltiplas ligas, Dynasty, IDP e Manager DNA completo',
      5990,
      'BRL',
      'month',
      JSON.stringify(['Tudo do Pro', 'Múltiplas ligas ilimitadas', 'Suporte Dynasty & IDP', 'Draft Center ao vivo', 'Manager DNA profundo'])
    );
    console.log('🌱 [Database] Planos de assinatura iniciais semeados com sucesso.');
  }
}
