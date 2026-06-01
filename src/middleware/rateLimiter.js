// src/middleware/rateLimiter.js
// Express rate limiters.
// Uses Redis store for PM2 cluster/multi-instance synchronization.

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { pubClient } = require('../config/redis');

// Response helper
const rateLimitResponse = (message) => ({
  success: false,
  message,
  code: 'RATE_LIMIT_EXCEEDED',
});

// Helper to create a lazy Redis-backed limiter to prevent:
// 1. Store reuse validation errors (each needs its own RedisStore instance)
// 2. Client is closed error (instantiated on first request, when Redis is already connected)
function createLazyLimiter(options, prefix) {
  let limiter;
  return (req, res, next) => {
    if (!limiter) {
      // Fallback to MemoryStore if Redis is not connected (e.g. no REDIS_URL on Render)
      const store = pubClient.isOpen 
        ? new RedisStore({
            sendCommand: async (...args) => {
              return pubClient.sendCommand(args);
            },
            prefix: `rl:${prefix}:`,
          })
        : undefined;

      limiter = rateLimit({
        store,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        validate: { creationStack: false },
        ...options,
      });
    }
    return limiter(req, res, next);
  };
}

// ─── Global: 200 req / 15 min per IP ─────────────────────────────────────────
const globalRateLimiter = createLazyLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: rateLimitResponse('Juda ko\'p so\'rov. 15 daqiqadan so\'ng urinib ko\'ring.'),
  skip: (req) => {
    // Skip health checks and ping endpoints from load balancers/crons
    return req.path === '/health' || req.path === '/ping';
  },
}, 'global');

// ─── Auth: 10 attempts / 15 min per IP ───────────────────────────────────────
const authRateLimiter = createLazyLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: rateLimitResponse('Juda ko\'p kirish urinishi. 15 daqiqadan so\'ng urinib ko\'ring.'),
}, 'auth');

// ─── File upload: 20 uploads / hour per IP ───────────────────────────────────
const uploadRateLimiter = createLazyLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: rateLimitResponse('Soatlik fayl yuklash limiti oshib ketdi. Keyinroq urinib ko\'ring.'),
}, 'upload');

// ─── Bid spam: 30 bids / hour per user ───────────────────────────────────────
const bidRateLimiter = createLazyLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `bid:${req.user?.userId || req.ip}`,
  message: rateLimitResponse('Soatda 30 tadan ko\'p taklif bera olmaysiz.'),
}, 'bid');

// ─── Review: 10 / hour per user ──────────────────────────────────────────────
const reviewRateLimiter = createLazyLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `review:${req.user?.userId || req.ip}`,
  message: rateLimitResponse('Soatda 10 tadan ko\'p baho qoldira olmaysiz.'),
}, 'review');

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  bidRateLimiter,
  reviewRateLimiter,
};
