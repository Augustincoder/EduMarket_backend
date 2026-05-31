const router = require('express').Router();
const { getBot } = require('../config/bot');
const env = require('../config/env');
const logger = require('../utils/logger');

// POST /webhook/telegram
router.post('/telegram', (req, res) => {
  // Ensure we are in production (Webhook mode)
  if (env.isDev) {
    return res.status(400).send('Webhook is disabled in development mode');
  }

  // Security check: ensure webhook payload matches our secret token
  // Telegram sends x-telegram-bot-api-secret-token header
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  if (secretToken !== env.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn('Unauthorized webhook request received');
    return res.status(401).send('Unauthorized');
  }

  try {
    const bot = getBot();
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    logger.error(`Webhook processing error: ${err.message}`);
    res.sendStatus(500);
  }
});

module.exports = router;
