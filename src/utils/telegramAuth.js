const crypto = require('crypto');
const env = require('../config/env');

/**
 * Telegram Mini App initData validator
 * Uses HMAC-SHA-256 to verify the data was actually sent by Telegram.
 * 
 * @param {string} initData - The raw initData string from TMA
 * @returns {object|null} Parsed user data if valid, null otherwise
 */
function validateInitData(initData) {
  if (!initData) return null;

  // Development/Mock bypass for browser testing
  if (env.isDev && (initData === 'mock_init_data' || initData.includes('hash=mock_hash'))) {
    return {
      id: 99999999,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    };
  }

  try {
    // 1. Parse URL-encoded initData string
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) return null;
    
    // Remove hash from params
    urlParams.delete('hash');
    
    // 2. Sort keys alphabetically
    const keys = Array.from(urlParams.keys()).sort();
    
    // 3. Create data check string
    const dataCheckString = keys
      .map(key => `${key}=${urlParams.get(key)}`)
      .join('\n');
      
    // 4. Generate secret key: HMAC-SHA-256(bot_token, 'WebAppData')
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(env.BOT_TOKEN)
      .digest();
      
    // 5. Generate signature: HMAC-SHA-256(dataCheckString, secretKey)
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
      
    // 6. Secure compare (mitigates timing attacks)
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash))) {
      // Valid! Parse the user JSON string
      const userStr = urlParams.get('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      
      // Optional: Check auth_date to prevent replay attacks (e.g., > 24 hours)
      const authDate = parseInt(urlParams.get('auth_date'), 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 86400) {
        // Init data expired
        return null;
      }
      
      return user;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

module.exports = { validateInitData };
