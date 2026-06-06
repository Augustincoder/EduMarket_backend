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

    bot.setChatMenuButton({
      chat_id: chatId,
      menu_button: {
        type: 'web_app',
        text: 'EduMarket 🎓',
        web_app: { url: appUrl }
      }
    }).catch(err => {
      logger.error(`Error setting chat menu button: ${err.message}`);
    });
  });

  // --- Handle Callback Queries (Inline button clicks) ---
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data === 'help') {
      const helpText = `🛠 <b>Yordam bo'limi</b>\n\nPlatforma Telegram Mini App ko'rinishida ishlaydi. Barcha amallar ilova ichida bajariladi.\nSavollaringiz bo'lsa adminga murojaat qiling.`;
      
      bot.sendMessage(chatId, helpText, { parse_mode: 'HTML' }).catch(e => logger.error(e));
      // Answer callback query to remove loading state from button
      bot.answerCallbackQuery(query.id);
    } else if (data.startsWith('verify_student_approve:')) {
      if (!env.ADMIN_TELEGRAM_IDS.includes(query.from.id)) {
        bot.answerCallbackQuery(query.id, { text: "Siz admin emassiz!", show_alert: true });
        return;
      }
      const userId = data.split(':')[1];
      const prisma = require('../config/prisma');
      
      Promise.all([
        prisma.user.update({
          where: { id: userId },
          data: { isVerifiedStudent: true, badge: 'ISHONCHLI', verificationStatus: 'APPROVED' }
        }),
        prisma.verificationRequest.updateMany({
          where: { userId, status: 'PENDING' },
          data: { status: 'APPROVED', resolvedAt: new Date() }
        })
      ]).then(([user]) => {
        bot.sendMessage(chatId, `✅ Foydalanuvchi <b>${user.fullname}</b> (ID: ${userId}) talabalik guvohnomasi muvaffaqiyatli tasdiqlandi.`, { parse_mode: 'HTML' });
        bot.sendMessage(user.telegramId.toString(), `🎉 <b>Tabriklaymiz!</b>\n\nSizning talabalik guvohnomangiz muvaffaqiyatli tasdiqlandi. Profilingizga "Ishonchli" 🔵 badge-i qo'shildi!`, { parse_mode: 'HTML' }).catch(() => {});
        bot.answerCallbackQuery(query.id, { text: "Tasdiqlandi" });
      }).catch((err) => {
        bot.sendMessage(chatId, `❌ Tasdiqlashda xatolik: ${err.message}`);
        bot.answerCallbackQuery(query.id);
      });
    } else if (data.startsWith('verify_student_reject:')) {
      if (!env.ADMIN_TELEGRAM_IDS.includes(query.from.id)) {
        bot.answerCallbackQuery(query.id, { text: "Siz admin emassiz!", show_alert: true });
        return;
      }
      const userId = data.split(':')[1];
      const prisma = require('../config/prisma');

      Promise.all([
        prisma.user.update({
          where: { id: userId },
          data: { isVerifiedStudent: false, verificationStatus: 'REJECTED' }
        }),
        prisma.verificationRequest.updateMany({
          where: { userId, status: 'PENDING' },
          data: { status: 'REJECTED', resolvedAt: new Date() }
        })
      ]).then((user) => {
        bot.sendMessage(chatId, `❌ Foydalanuvchi <b>${user[0].fullname}</b> (ID: ${userId}) talabalik guvohnomasi rad etildi.`, { parse_mode: 'HTML' });
        bot.sendMessage(user[0].telegramId.toString(), `⚠️ <b>Diqqat!</b>\n\nSizning talabalik guvohnomangiz tasdiqlanmadi. Iltimos, guvohnoma rasmini qaytadan yuklang yoki qo'llab-quvvatlash bo'limiga yozing.`, { parse_mode: 'HTML' }).catch(() => {});
        bot.answerCallbackQuery(query.id, { text: "Rad etildi" });
      }).catch((err) => {
        bot.sendMessage(chatId, `❌ Rad etishda xatolik: ${err.message}`);
        bot.answerCallbackQuery(query.id);
      });
    }
  });

  logger.info('Telegram bot command handlers initialized');
}

module.exports = { initBotHandlers };
