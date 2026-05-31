// src/config/bot.js
// Telegram Bot singleton.
// - Development: polling (no webhook setup needed)
// - Production : webhook (set via /webhook/telegram route)
//
// IMPORTANT: This module is required lazily by services — not at startup.
// This allows the server to start even if Telegram is temporarily unreachable.

const TelegramBot = require('node-telegram-bot-api');
const env = require('./env');
const logger = require('../utils/logger');

let bot;

function getBot() {
  if (bot) return bot;

  try {
    bot = new TelegramBot(env.BOT_TOKEN, {
      // Polling only in development
      polling: env.isDev
        ? {
            interval: 300,
            autoStart: true,
            params: { timeout: 10 },
          }
        : false,
    });

    // Development polling error handler
    if (env.isDev) {
      bot.on('polling_error', (err) => {
        // Log but don't crash — Telegram API can be flaky
        logger.warn(`Telegram polling error: ${err.code} — ${err.message}`);
      });

      bot.on('error', (err) => {
        logger.error(`Telegram bot error: ${err.message}`);
      });

      logger.info('Telegram bot started in POLLING mode (development)');
    } else {
      logger.info('Telegram bot initialized in WEBHOOK mode (production)');
    }

    // Initialize bot command handlers
    const { initBotHandlers } = require('../bot/handlers');
    initBotHandlers(bot);
    
  } catch (err) {
    logger.error(`Failed to initialize Telegram bot: ${err.message}`);
    throw err;
  }

  return bot;
}

module.exports = { getBot };
