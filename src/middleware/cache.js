const { pubClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Express middleware to cache GET responses in Redis
 * @param {number} ttlInSeconds - Cache duration in seconds
 */
function cache(ttlInSeconds = 30) {
  return async (req, res, next) => {
    // 1. Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // 2. Bypass cache if Redis isn't ready
    if (!pubClient.isReady) {
      return next();
    }

    // 3. Generate a unique key based on the full URL (including query parameters)
    const key = `edumarket:cache:${req.originalUrl || req.url}`;

    try {
      // 4. Check Redis
      const cachedResponse = await pubClient.get(key);
      if (cachedResponse) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Cache', 'HIT');
        return res.send(cachedResponse);
      }
    } catch (err) {
      logger.error(`Redis keshni o'qishda xatolik: ${err.message}`);
    }

    res.setHeader('X-Cache', 'MISS');

    // 5. Intercept res.send to save the response to Redis
    const originalSend = res.send;
    res.send = function (body) {
      // Restore original send immediately to avoid recursion
      res.send = originalSend;

      // Only cache successful JSON responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const dataToCache = typeof body === 'object' ? JSON.stringify(body) : body;
          
          pubClient.setEx(key, ttlInSeconds, dataToCache).catch(err => {
            logger.error(`Redis keshga yozishda xatolik: ${err.message}`);
          });
        } catch (err) {
          logger.error(`Kesh ma'lumotini shakllantirishda xatolik: ${err.message}`);
        }
      }

      // Send the response to the user
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Helper to explicitly clear cache patterns (e.g. after Edit/Delete)
 */
async function clearCache(pattern) {
  if (!pubClient.isReady) return;
  try {
    const keys = await pubClient.keys(`edumarket:cache:${pattern}`);
    if (keys.length > 0) {
      await pubClient.del(keys);
    }
  } catch (err) {
    logger.error(`Keshni tozalashda xatolik: ${err.message}`);
  }
}

module.exports = { cache, clearCache };
