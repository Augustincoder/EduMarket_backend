const { getBot } = require('../../config/bot');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const env = require('../../config/env');

/**
 * Helper to check user notification preferences
 */
async function shouldSendNotification(userId, prefKey) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifPrefs: true }
  });

  if (!user || !user.notifPrefs) return true; // Default true if no prefs set

  // If preference explicitly set to false, don't send
  if (user.notifPrefs[prefKey] === false) {
    return false;
  }

  return true;
}

/**
 * Helper to send Telegram message safely
 */
async function sendTelegramMessage(telegramId, text, inlineKeyboard = null) {
  try {
    const bot = getBot();
    const options = { parse_mode: 'HTML' };
    
    if (inlineKeyboard) {
      options.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    
    await bot.sendMessage(telegramId, text, options);
    return true;
  } catch (err) {
    // If user blocked bot, Telegram returns 403 Forbidden
    if (err.response && err.response.statusCode === 403) {
      logger.warn(`User ${telegramId} blocked the bot. Skipping notification.`);
    } else {
      logger.error(`Failed to send notification to ${telegramId}: ${err.message}`);
    }
    return false;
  }
}

// ─── Notification Methods ──────────────────────────────────────────────────────

async function notifyNewBid(taskClientId, freelancerName, bidAmount, taskId) {
  if (!(await shouldSendNotification(taskClientId, 'newBid'))) return;

  const client = await prisma.user.findUnique({ where: { id: taskClientId }, select: { telegramId: true } });
  if (!client) return;

  const text = `📬 <b>Yangi taklif!</b>\n\n<b>${freelancerName}</b> sizning vazifangizga <b>${bidAmount} so'm</b> taklif qildi.`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/your_bot_username/app?startapp=task_${taskId}` } }]];

  await sendTelegramMessage(client.telegramId.toString(), text, keyboard);
}

async function notifyTaskAssigned(freelancerId, taskTitle, taskId) {
  if (!(await shouldSendNotification(freelancerId, 'taskAssigned'))) return;

  const freelancer = await prisma.user.findUnique({ where: { id: freelancerId }, select: { telegramId: true } });
  if (!freelancer) return;

  const text = `🎉 <b>Tabriklaymiz!</b>\n\nSiz <b>"${taskTitle}"</b> vazifasini bajarish uchun tanlandingiz!`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/your_bot_username/app?startapp=task_${taskId}` } }]];

  await sendTelegramMessage(freelancer.telegramId.toString(), text, keyboard);
}

async function notifyChatMessage(recipientId, senderName, taskId) {
  if (!(await shouldSendNotification(recipientId, 'chatMessage'))) return;

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { telegramId: true } });
  if (!recipient) return;

  const text = `💬 <b>Yangi xabar</b>\n\n<b>${senderName}</b> vazifa bo'yicha sizga xabar yubordi.`;
  const keyboard = [[{ text: "Chatni ochish", web_app: { url: `https://t.me/your_bot_username/app?startapp=chat_${taskId}` } }]];

  await sendTelegramMessage(recipient.telegramId.toString(), text, keyboard);
}

async function notifyDeadlineApproaching(freelancerId, taskTitle, taskId) {
  if (!(await shouldSendNotification(freelancerId, 'deadlineReminder'))) return;

  const freelancer = await prisma.user.findUnique({ where: { id: freelancerId }, select: { telegramId: true } });
  if (!freelancer) return;

  const text = `⏰ <b>Muddat yaqinlashmoqda!</b>\n\n<b>"${taskTitle}"</b> vazifasini topshirish muddati tugashiga 24 soatdan kam vaqt qoldi.`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/your_bot_username/app?startapp=task_${taskId}` } }]];

  await sendTelegramMessage(freelancer.telegramId.toString(), text, keyboard);
}

async function notifyReviewReceived(recipientId, senderName, rating, taskId) {
  if (!(await shouldSendNotification(recipientId, 'reviewReminder'))) return;

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { telegramId: true } });
  if (!recipient) return;

  const stars = '⭐'.repeat(rating);
  const text = `📈 <b>Yangi baho!</b>\n\n<b>${senderName}</b> sizning ishingizni baholadi: ${stars}`;
  
  await sendTelegramMessage(recipient.telegramId.toString(), text);
}

async function autoCompleted(task) {
  const msg =
    `✅ <b>"${task.title}"</b> vazifasi avtomatik yakunlandi.\n` +
    `(Mijoz 48 soat ichida javob bermadi)`;

  if (task.freelancer) await sendTelegramMessage(task.freelancer.telegramId.toString(), msg);
  if (task.client) await sendTelegramMessage(task.client.telegramId.toString(), msg);
}

async function disputeOpened(task, dispute) {
  const msgClient = `⚠️ <b>Nizo ochildi</b>\n\n<b>"${task.title}"</b> vazifasi bo'yicha nizo ochildi. Admin tez orada ko'rib chiqadi.`;
  const msgAdmin = `🚨 <b>Yangi nizo!</b>\n\nVazifa ID: ${task.id}\nOchuvchi ID: ${dispute.openedByUserId}\nSabab: ${dispute.reason}`;

  if (task.client) await sendTelegramMessage(task.client.telegramId.toString(), msgClient);
  if (task.freelancer) await sendTelegramMessage(task.freelancer.telegramId.toString(), msgClient);
  // Optional: send to admin channel or all admins
}

async function disputeResolved(task, dispute, winner) {
  const msg = `⚖️ <b>Nizo hal qilindi</b>\n\n<b>"${task.title}"</b> vazifasi bo'yicha nizo <b>${winner === 'CLIENT' ? 'MIJOZ' : 'IJROCHI'}</b> foydasiga hal qilindi.\n\nIzoh: ${dispute.adminNotes || 'Izohsiz'}`;
  
  if (task.client) await sendTelegramMessage(task.client.telegramId.toString(), msg);
  if (task.freelancer) await sendTelegramMessage(task.freelancer.telegramId.toString(), msg);
}

async function taskCompleted(task) {
  const msg = `✅ <b>Vazifa qabul qilindi</b>\n\n<b>"${task.title}"</b> vazifasi muvaffaqiyatli qabul qilindi! To'lov o'tkaziladi.`;
  if (task.freelancer) await sendTelegramMessage(task.freelancer.telegramId.toString(), msg);
}

async function revisionRequested(task, note) {
  const msg = `🔄 <b>Qayta ishlash so'raldi</b>\n\n<b>"${task.title}"</b> vazifasini mijoz qayta ishlashga qaytardi.\n\nIzoh: ${note || 'Izohsiz'}`;
  if (task.freelancer) await sendTelegramMessage(task.freelancer.telegramId.toString(), msg);
}

async function smartMatchNotify(freelancer, task) {
  const text = `🎯 <b>Sizga mos yangi ish chiqdi!</b>\n\n<b>"${task.title}"</b>\nKategoriya: ${task.category}\nNarx: ${task.priceMin} - ${task.priceMax} so'm\n\nVIP mutaxassis bo'lganingiz uchun sizga ushbu xabar hammadan oldin yuborildi. Darhol taklif qoldiring!`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/your_bot_username/app?startapp=task_${task.id}` } }]];
  await sendTelegramMessage(freelancer.telegramId.toString(), text, keyboard);
}

async function referralBonusNotify(user, daysAdded) {
  const text = `🎁 <b>Referral Bonus!</b>\n\nSiz taklif qilgan do'stingiz VIP paket sotib oldi! Sizga <b>+${daysAdded} kun</b> bepul VIP taqdim etildi.`;
  await sendTelegramMessage(user.telegramId.toString(), text);
}

async function notifyAdminsVerifyStudent(user, fileId) {
  const text = `🎓 <b>Yangi talaba guvohnomasi!</b>\n\nFoydalanuvchi: <b>${user.fullname}</b> (ID: ${user.id}, TG: @${user.username || ''})\nGuvohnoma File ID: <code>${fileId}</code>\n\nUni tasdiqlash yoki rad etish uchun quyidagi tugmalarni bosing.`;
  const keyboard = [
    [
      { text: "Tasdiqlash ✅", callback_data: `verify_student_approve:${user.id}` },
      { text: "Rad etish ❌", callback_data: `verify_student_reject:${user.id}` }
    ]
  ];
  for (const adminId of env.ADMIN_TELEGRAM_IDS) {
    await sendTelegramMessage(adminId.toString(), text, keyboard);
  }
}

async function notifyWarning(userId, message) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
  if (!user) return;
  const text = `⚠️ <b>Ogohlantirish!</b>\n\n${message}`;
  await sendTelegramMessage(user.telegramId.toString(), text);
}

async function notifyBroadcast(telegramId, text) {
  await sendTelegramMessage(telegramId.toString(), text);
}

module.exports = {
  notifyNewBid,
  notifyTaskAssigned,
  notifyChatMessage,
  notifyDeadlineApproaching,
  notifyReviewReceived,
  autoCompleted,
  disputeOpened,
  disputeResolved,
  taskCompleted,
  revisionRequested,
  smartMatchNotify,
  referralBonusNotify,
  notifyAdminsVerifyStudent,
  notifyWarning,
  notifyBroadcast
};
