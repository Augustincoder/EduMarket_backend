const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

// Local cache to minimize DB lookups
let flagsCache = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache for flags

/**
 * Initialize or refresh flags cache
 */
async function refreshFlags() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: 'ff_' } }
    });

    const newFlags = {};
    settings.forEach(s => {
      // Key format: ff_feature_name
      const flagName = s.key.replace('ff_', '');
      newFlags[flagName] = s.value === 'true' || s.value === '1';
    });

    flagsCache = newFlags;
    lastCacheUpdate = Date.now();
  } catch (err) {
    logger.error(`Failed to refresh feature flags: ${err.message}`);
  }
}

/**
 * Check if a feature flag is enabled
 */
async function isEnabled(flagName) {
  // Auto-refresh if cache is stale
  if (Date.now() - lastCacheUpdate > CACHE_TTL) {
    await refreshFlags();
  }

  // If flag doesn't exist, default to false (safe)
  return !!flagsCache[flagName];
}

/**
 * Middleware to gate routes by feature flag
 */
function gateFeature(flagName) {
  return async (req, res, next) => {
    const enabled = await isEnabled(flagName);
    if (!enabled) {
      return res.status(403).json({
        success: false,
        message: 'Ushbu funksiya hozirda vaqtincha yopiq (BETA)',
        code: 'FEATURE_DISABLED'
      });
    }
    next();
  };
}

module.exports = {
  isEnabled,
  gateFeature,
  refreshFlags
};
