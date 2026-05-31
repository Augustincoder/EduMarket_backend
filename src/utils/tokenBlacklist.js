const NodeCache = require('node-cache');
const env = require('../config/env');

// Parse JWT_EXPIRES_IN (e.g., "7d") to seconds for the cache TTL
let ttlSeconds = 7 * 24 * 60 * 60; // Default 7 days
if (env.JWT_EXPIRES_IN.endsWith('d')) {
  ttlSeconds = parseInt(env.JWT_EXPIRES_IN) * 24 * 60 * 60;
} else if (env.JWT_EXPIRES_IN.endsWith('h')) {
  ttlSeconds = parseInt(env.JWT_EXPIRES_IN) * 60 * 60;
}

// In-memory cache for blacklisted tokens
// In a clustered environment, this should be replaced with Redis
const blacklist = new NodeCache({ stdTTL: ttlSeconds, checkperiod: 3600 });

/**
 * Add a JWT's unique ID (jti) to the blacklist
 * @param {string} jti - JWT ID
 */
function blacklistToken(jti) {
  if (jti) {
    blacklist.set(jti, true);
  }
}

/**
 * Check if a JWT ID is blacklisted
 * @param {string} jti - JWT ID
 * @returns {boolean} True if blacklisted
 */
function isBlacklisted(jti) {
  if (!jti) return false;
  return blacklist.has(jti);
}

module.exports = { blacklistToken, isBlacklisted };
