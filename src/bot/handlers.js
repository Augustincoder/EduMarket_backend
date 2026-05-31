const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Initializes all Telegram bot command handlers
 * @param {import('node-telegram-bot-api')} bot 
 */
function initBotHandlers(bot) {
  // --- /start Command ---
  bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Foydalanuvchi';
    const startPayload = match[1] || '';
    
    // Parse referral code if it starts with ref_
    let referralCode = '';
    if (startPayload.startsWith('ref_')) {
      referralCode = startPayload.replace('ref_', '');
    }
    
    const welcomeText = `👋 Salom, <b>${firstName}</b>!\n\n🎓 <b>EduMarket</b> platformasiga xush kelibsiz!\n\nBu yerda siz o'z vazifalaringizni mutaxassislarga topshirishingiz yoki freelancer sifatida daromad topishingiz mumkin.\n\n👇 <b>Ilovani ochish</b> tugmasini bosib platformadan foydalanishni boshlang.`;

    const baseUrl = (env.ALLOWED_ORIGINS[0] && env.ALLOWED_ORIGINS[0].startsWith('https')) 
                     ? env.ALLOWED_ORIGINS[0] 
                     : 'https://google.com';
                     
    const appUrl = referralCode ? `${baseUrl}?ref=${referralCode}` : baseUrl;

    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Ilovani ochish",
              web_app: { 
                url: appUrl
              }
            }
          ],
          [
            {
              text: "ℹ️ Yordam",
              callback_data: "help"
            }
          ]
        ]
      }
    };

    bot.sendMessage(chatId, welcomeText, options).catch(err => {
      logger.error(`Error sending /start message: ${err.message}`);
    });
  });

  // --- Handle Callback Queries (Inline button clicks) ---
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    
    if (query.data === 'help') {
      const helpText = `🛠 <b>Yordam bo'limi</b>\n\nPlatforma Telegram Mini App ko'rinishida ishlaydi. Barcha amallar ilova ichida bajariladi.\nSavollaringiz bo'lsa adminga murojaat qiling.`;
      
      bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' }).catch(e => logger.error(e));
      // Answer callback query to remove loading state from button
      bot.answerCallbackQuery(query.id);
    }
  });

  logger.info('Telegram bot command handlers initialized');
}

module.exports = { initBotHandlers };
