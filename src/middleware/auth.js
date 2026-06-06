const { verifyToken } = require('../utils/jwt');
const { isBlacklisted } = require('../utils/tokenBlacklist');
const { AppError, asyncHandler } = require('./errorHandler');
const prisma = require('../config/prisma');

/**
 * Authentication middleware.
 * Checks for a valid JWT in cookies or Authorization header.
 * Attaches user to req.user if valid.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Try to get token from Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Fallback to cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new AppError('Iltimos, tizimga kiring', 401, 'NO_TOKEN_PROVIDED');
  }

  try {
    // Verify token structure and signature
    const decoded = verifyToken(token);

    // Check if token was blacklisted (logged out)
    if (isBlacklisted(decoded.jti)) {
      throw new AppError('Sessiya yakunlangan. Qayta kiring.', 401, 'TOKEN_BLACKLISTED');
    }

    // Ensure user still exists and is not banned
    const userIdStr = String(decoded.userId);
    let user = await prisma.user.findUnique({
      where: { id: userIdStr },
      select: { id: true, role: true, isBanned: true, isVip: true, vipExpiresAt: true }
    });
      if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 404, 'USER_NOT_FOUND');
    }

    if (user.isBanned) {
      throw new AppError('Hisobingiz bloklangan', 403, 'USER_BANNED');
    }

    // Check if VIP expired
    if (user.isVip && user.vipExpiresAt && new Date(user.vipExpiresAt) < new Date()) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVip: false, vipExpiresAt: null }
      });
    }

    // Attach user payload to request with stringified ID
    req.user = { ...decoded, userId: userIdStr, isVip: user.isVip, vipExpiresAt: user.vipExpiresAt };
    
    // Attach the actual token to req.token so we can blacklist it on logout
    req.token = token;
    req.jti = decoded.jti;

    next();
  } catch (err) {
    // Delegate to global error handler which specifically handles JsonWebTokenError
    throw err;
  }
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    if (!isBlacklisted(decoded.jti)) {
      req.user = { ...decoded, userId: String(decoded.userId) };
    }
  } catch (err) {
    // Ignore error if token is invalid, just proceed as unauthenticated
  }
  
  next();
});

module.exports = { requireAuth, optionalAuth };
