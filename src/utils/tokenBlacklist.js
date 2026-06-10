const { pubClient } = require('../config/redis');

async function blacklistToken(token, expiresInSeconds) {
  if (!pubClient.isOpen) return; // Redis yo'q bo'lsa o'tkazib yubor
  const key = `bl:${token}`;
  await pubClient.setEx(key, expiresInSeconds, '1');
}

async function isTokenBlacklisted(token) {
  if (!pubClient.isOpen) return false;
  const result = await pubClient.get(`bl:${token}`);
  return result === '1';
}

module.exports = { blacklistToken, isTokenBlacklisted };
