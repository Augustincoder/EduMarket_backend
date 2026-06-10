const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a JWT for a user
 * 
 * @param {object} payload - Data to encode (e.g. { userId: 1, role: 'USER' })
 * @returns {string} Signed JWT
 */
function generateToken(payload) {
  // Add a unique JWT ID (jti) to the payload for blacklisting
  const tokenPayload = {
    ...payload,
    jti: uuidv4()
  };
  
  return jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Generate a JWT for an admin
 * 
 * @param {object} payload - Data to encode
 * @returns {string} Signed JWT
 */
function generateAdminToken(payload) {
  const tokenPayload = {
    ...payload,
    jti: uuidv4()
  };
  
  return jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: '4h',
  });
}

/**
 * Verify a JWT
 * 
 * @param {string} token - The JWT string
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError} If invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { generateToken, generateAdminToken, verifyToken };
