// src/config/env.js
// Fail-fast environment variable validator.
// Import this FIRST in server.js — before any other module.
// If any required variable is missing, process exits immediately
// with a clear error message rather than a cryptic runtime failure later.

require('dotenv').config();

// ─── Required variables ───────────────────────────────────────────────────────
const REQUIRED = [
  'DATABASE_URL',
  'BOT_TOKEN',
  'BOT_STORAGE_CHANNEL_ID',
  'JWT_SECRET',
  'ADMIN_TELEGRAM_IDS',
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `\n[FATAL] Muhit o'zgaruvchilari topilmadi: ${missing.join(', ')}\n` +
    `.env.example fayliga qarang va .env faylini to'ldiring.\n`
  );
  process.exit(1);
}

// ─── Value-level validation ───────────────────────────────────────────────────
if (process.env.JWT_SECRET.length < 32) {
  console.error('\n[FATAL] JWT_SECRET kamida 32 belgidan iborat bo\'lishi kerak.\n');
  process.exit(1);
}

if (process.env.BOT_STORAGE_CHANNEL_ID === '-100xxxxxxxxxx') {
  console.error('\n[FATAL] BOT_STORAGE_CHANNEL_ID o\'rnatilmagan (hali placeholder qiymat).\n');
  process.exit(1);
}

// ─── Parse + export ───────────────────────────────────────────────────────────
const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  DATABASE_URL: process.env.DATABASE_URL,

  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_STORAGE_CHANNEL_ID: process.env.BOT_STORAGE_CHANNEL_ID,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || null,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Parse comma-separated admin IDs → number[]
  // '123456789,987654321' → [123456789, 987654321]
  ADMIN_TELEGRAM_IDS: process.env.ADMIN_TELEGRAM_IDS
    .split(',')
    .map((id) => {
      const parsed = parseInt(id.trim(), 10);
      if (isNaN(parsed)) {
        console.error(`[FATAL] ADMIN_TELEGRAM_IDS ichida yaroqsiz qiymat: '${id.trim()}'`);
        process.exit(1);
      }
      return parsed;
    }),

  // Parse allowed CORS origins (optional, has defaults)
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // Helper computed flags
  get isDev() {
    return this.NODE_ENV === 'development';
  },
  get isProd() {
    return this.NODE_ENV === 'production';
  },
};

module.exports = env;
