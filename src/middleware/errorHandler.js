// src/middleware/errorHandler.js
// Centralized error handling.
//
// Design decisions:
// 1. AppError class — structured errors with status codes that propagate cleanly
// 2. asyncHandler — eliminates try/catch boilerplate in every controller
// 3. Global handler — catches Prisma errors, Multer errors, and unknown errors
// 4. Stack traces only in development
// 5. All client-facing messages in Uzbek

const logger = require('../utils/logger');
const Sentry = require('@sentry/node');

// ─── AppError ─────────────────────────────────────────────────────────────────
/**
 * Use AppError for all intentional business logic errors.
 *
 * @example
 * throw new AppError('Vazifa topilmadi', 404);
 * throw new AppError('Ruxsat yo\'q', 403, 'FORBIDDEN');
 */
class AppError extends Error {
  /**
   * @param {string} message   - User-facing error message (Uzbek)
   * @param {number} status    - HTTP status code
   * @param {string} [code]    - Machine-readable error code (optional)
   */
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    // Capture stack trace (skips this constructor frame)
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── asyncHandler ─────────────────────────────────────────────────────────────
/**
 * Wraps an async route handler and forwards any thrown error to next().
 * Use on EVERY controller function — eliminates try/catch boilerplate.
 *
 * @param {Function} fn - Async route handler (req, res, next)
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be the LAST middleware registered in app.js (4 arguments signature is required)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ── Prisma Known Request Errors ──
  if (err.code === 'P2002') {
    // Unique constraint violation
    return res.status(409).json({
      success: false,
      message: 'Bu ma\'lumot allaqachon mavjud',
      code: 'DUPLICATE_ENTRY',
    });
  }

  if (err.code === 'P2025') {
    // Record not found (Prisma update/delete on missing record)
    return res.status(404).json({
      success: false,
      message: 'Ma\'lumot topilmadi',
      code: 'NOT_FOUND',
    });
  }

  if (err.code === 'P2003') {
    // Foreign key constraint failure
    return res.status(400).json({
      success: false,
      message: 'Bog\'liq ma\'lumot topilmadi',
      code: 'FOREIGN_KEY_VIOLATION',
    });
  }

  // ── Multer Errors ──
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Fayl hajmi 20MB dan oshmasligi kerak',
      code: 'FILE_TOO_LARGE',
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Bir vaqtda maksimal 5 ta fayl yuklash mumkin',
      code: 'TOO_MANY_FILES',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Kutilmagan fayl maydoni',
      code: 'UNEXPECTED_FILE_FIELD',
    });
  }

  // ── JWT Errors ──
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token yaroqsiz',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token muddati o\'tgan. Qayta kiring.',
      code: 'TOKEN_EXPIRED',
    });
  }

  // ── Zod Validation Errors ──
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Noto\'g\'ri ma\'lumot',
      code: 'VALIDATION_ERROR',
      errors: err.flatten ? err.flatten().fieldErrors : err.errors,
    });
  }

  // ── AppError (our own intentional errors) ──
  if (err instanceof AppError || err.status) {
    if (err.status >= 500) {
      logger.error({
        message: err.message,
        code: err.code,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.userId,
      });
      if (process.env.SENTRY_DSN) Sentry.captureException(err);
    }

    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  // ── Unknown / Unhandled errors ──
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.userId,
    body: req.body,
  });
  
  if (process.env.SENTRY_DSN) Sentry.captureException(err);

  return res.status(500).json({
    success: false,
    message: 'Ichki server xatosi. Iltimos keyinroq urinib ko\'ring.',
    code: 'INTERNAL_SERVER_ERROR',
    // Only expose stack trace in development
    ...(process.env.NODE_ENV === 'development' && {
      debug: { message: err.message, stack: err.stack },
    }),
  });
}

module.exports = { AppError, asyncHandler, errorHandler };
