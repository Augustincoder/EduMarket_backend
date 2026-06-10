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
  'JWT_SECRET',
  'ADMIN_TELEGRAM_IDS',
  // R2 storage — required for file uploads
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
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


// ─── Parse + export ───────────────────────────────────────────────────────────
const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  DATABASE_URL: process.env.DATABASE_URL,

  BOT_TOKEN: process.env.BOT_TOKEN,
  // BOT_STORAGE_CHANNEL_ID no longer required (replaced by R2)
  BOT_STORAGE_CHANNEL_ID: process.env.BOT_STORAGE_CHANNEL_ID || null,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || null,

  // ─── Cloudflare R2 Object Storage ───────────────────────────────────────────
  // Endpoint: jurisdiction-specific S3-compatible URL
  R2_ENDPOINT:          process.env.R2_ENDPOINT,
  R2_ACCESS_KEY_ID:     process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME:       process.env.R2_BUCKET_NAME,
  // Public CDN URL for serving public files (images) without presigning
  R2_PUBLIC_URL:        process.env.R2_PUBLIC_URL || null,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,

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
