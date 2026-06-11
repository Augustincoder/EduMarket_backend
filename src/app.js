// src/app.js
// Express application factory.
// No app.listen() here — that lives in server.js.
// This pattern makes testing easy (import app without starting the server).

// Fix BigInt serialization for JSON responses
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const prisma = require('./config/prisma');

// Routers
const authRouter = require('./modules/auth/auth.router');
const taskRouter = require('./modules/task/task.router');
const bidRouter = require('./modules/bid/bid.router');
const chatRouter = require('./modules/chat/chat.router');
const fileRouter = require('./modules/file/file.router');
const reviewRouter = require('./modules/review/review.router');
const vipRouter = require('./modules/vip/vip.router');
const adminRouter = require('./modules/admin/admin.router');
const webhookRouter = require('./routes/webhook.router');
const profileRouter = require('./modules/profile/profile.router');
const analyticsRouter = require('./modules/analytics/analytics.router');
const portfolioRouter = require('./modules/portfolio/portfolio.router');
const gigRouter = require('./modules/gig/gig.router');
const onboardingRouter = require('./modules/auth/onboarding.router');
const reportRouter = require('./modules/report/report.router');
const verificationRouter = require('./modules/verification/verification.router');
const notificationRouter = require('./modules/notification/notification.router');
const aiRouter = require('./modules/ai/ai.router');
const categoryRouter = require('./modules/category/category.router');

// ─── CORS config ──────────────────────────────────────────────────────────────
// Telegram Mini Apps run in an iframe — browsers treat them as cross-origin.
// SameSite=None cookies require HTTPS (handled by Nginx in production).
const ALWAYS_ALLOWED = [
  'https://web.telegram.org',
  'https://telegram.org',
  'https://webk.telegram.org',
  'https://webz.telegram.org',
];

// Allow custom origins from env + always-allowed list
const allowedOrigins = [
  ...ALWAYS_ALLOWED,
  ...env.ALLOWED_ORIGINS,
  ...(env.isDev ? ['http://localhost:5173', 'http://localhost:3000'] : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: '${origin}' manziliga ruxsat yo'q`));
  },
  credentials: true, // Required for cookies
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Bot-Api-Secret-Token'],
};

// ─── App factory ──────────────────────────────────────────────────────────────
function createApp() {
  const app = express();

  // ── Trust proxy (required when behind Nginx) ──────────────────────────────
  // Allows correct IP extraction via req.ip (not Nginx's IP)
  app.set('trust proxy', 1);

  // ── Security headers (helmet) ─────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Required for Telegram Mini App
      contentSecurityPolicy: env.isProd, // Enable CSP only in production
    })
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // Preflight for all routes

  // ── Compression ───────────────────────────────────────────────────────────
  // Gzip/Brotli response compression (skip small responses <1KB)
  app.use(compression({ threshold: 1024 }));

  // ── HTTP Request logging ──────────────────────────────────────────────────
  if (env.isDev) {
    app.use(morgan('dev'));
  } else {
    // Production: structured log via Winston stream
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
        skip: (req) => req.path === '/health', // Don't log health checks
      })
    );
  }

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // ── Cookie parsing ────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── Global rate limiting ──────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // Lightweight ping endpoint for keep-alive crons (prevents Render sleep mode without DB load)
  app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get('/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        ts: Date.now(),
        uptime: Math.floor(process.uptime()),
        db: 'connected',
        env: env.NODE_ENV,
      });
    } catch (err) {
      logger.error('Health check failed:', err.message);
      res.status(503).json({
        status: 'error',
        ts: Date.now(),
        db: 'disconnected',
        error: 'Ma\'lumotlar bazasiga ulanib bo\'lmadi',
      });
    }
  });

  // ─── Metrics endpoint (Prometheus) ────────────────────────────────────────
  const { registry } = require('./config/metrics');
  app.get('/metrics', async (req, res) => {
    // Faqat internal network'dan (production da nginx bilan himoya)
    const clientIp = req.ip || req.connection.remoteAddress;
    if (env.isProd && !clientIp.includes('127.0.0.1') && !clientIp.includes('::1')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  // ─── API v1 Routes ────────────────────────────────────────────────────────
  // All API routes are versioned from day 1
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/tasks', taskRouter);
  app.use('/api/v1/bids', bidRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/files', fileRouter);
  app.use('/api/v1/reviews', reviewRouter);
  app.use('/api/v1/vip', vipRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/users', profileRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/portfolio', portfolioRouter);
  app.use('/api/v1/gigs', gigRouter);
  app.use('/api/v1/onboarding', onboardingRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/verification', verificationRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/ai', aiRouter);
  app.use('/api/v1/categories', categoryRouter);

  // Telegram webhook (not under /api/v1 — Telegram calls this directly)
  if (webhookRouter) app.use('/webhook', webhookRouter);

  // ─── 404 handler ──────────────────────────────────────────────────────────
  app.all('*', (req, res, next) => {
    next(new AppError(`Topilmadi: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
  });

  // ─── Sentry error handler (MUST be before our global error handler) ───────
  const Sentry = require('@sentry/node');
  Sentry.setupExpressErrorHandler(app);

  // ─── Global error handler (MUST be last) ──────────────────────────────────
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
