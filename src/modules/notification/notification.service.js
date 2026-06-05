const { getBot } = require('../../config/bot');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const env = require('../../config/env');
const { admin } = require('../../config/firebase');

/**
 * Helper to check user notification preferences
 */
async function shouldSendNotification(userId, prefKey) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifPrefs: true, pushToken: true }
  });

  if (!user) return { shouldSend: true, pushToken: null };

  const notifPrefs = user.notifPrefs || {};
  // If preference explicitly set to false, don't send
  if (notifPrefs[prefKey] === false) {
    return { shouldSend: false, pushToken: user.pushToken };
  }

  return { shouldSend: true, pushToken: user.pushToken };
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

/**
 * Helper to send Firebase Push Notification
 */
async function sendPushNotification(token, title, body, data = {}) {
  if (!token) return false;

  try {
    const message = {
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Legacy but still used by some libs
      },
      token
    };

    await admin.messaging().send(message);
    return true;
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      logger.warn(`Push token no longer valid. Removing...`);
      // Optionally remove from DB
    } else {
      logger.error(`Firebase Push error: ${err.message}`);
    }
    return false;
  }
}

// ─── Notification Methods ──────────────────────────────────────────────────────

async function notifyNewBid(taskClientId, freelancerName, bidAmount, taskId) {
  const { shouldSend, pushToken } = await shouldSendNotification(taskClientId, 'newBid');
  if (!shouldSend) return;

  const client = await prisma.user.findUnique({ where: { id: taskClientId }, select: { telegramId: true } });
  if (!client) return;

  const title = "📬 Yangi taklif!";
  const text = `<b>${freelancerName}</b> sizning vazifangizga <b>${bidAmount} so'm</b> taklif qildi.`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/${env.BOT_USERNAME}/app?startapp=task_${taskId}` } }]];

  await sendTelegramMessage(client.telegramId.toString(), text, keyboard);
  
  if (pushToken) {
    await sendPushNotification(pushToken, title, text.replace(/<[^>]*>?/gm, ''), { taskId, type: 'new_bid' });
  }
}

async function notifyTaskAssigned(freelancerId, taskTitle, taskId) {
  const { shouldSend, pushToken } = await shouldSendNotification(freelancerId, 'taskAssigned');
  if (!shouldSend) return;

  const freelancer = await prisma.user.findUnique({ where: { id: freelancerId }, select: { telegramId: true } });
  if (!freelancer) return;

  const title = "🎉 Tabriklaymiz!";
  const text = `Siz <b>"${taskTitle}"</b> vazifasini bajarish uchun tanlandingiz!`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/${env.BOT_USERNAME}/app?startapp=task_${taskId}` } }]];

  await sendTelegramMessage(freelancer.telegramId.toString(), text, keyboard);

  if (pushToken) {
    await sendPushNotification(pushToken, title, text.replace(/<[^>]*>?/gm, ''), { taskId, type: 'task_assigned' });
  }
}

async function notifyChatMessage(recipientId, senderName, taskId) {
  const { shouldSend, pushToken } = await shouldSendNotification(recipientId, 'chatMessage');
  if (!shouldSend) return;

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { telegramId: true } });
  if (!recipient) return;

  const title = "💬 Yangi xabar";
  const text = `<b>${senderName}</b> vazifa bo'yicha sizga xabar yubordi.`;
  const keyboard = [[{ text: "Chatni ochish", web_app: { url: `https://t.me/${env.BOT_USERNAME}/app?startapp=chat_${taskId}` } }]];

  await sendTelegramMessage(recipient.telegramId.toString(), text, keyboard);

  if (pushToken) {
    await sendPushNotification(pushToken, title, text.replace(/<[^>]*>?/gm, ''), { taskId, type: 'chat_message' });
  }
}

async function notifyDeadlineApproaching(freelancerId, taskTitle, taskId) {
  const { shouldSend, pushToken } = await shouldSendNotification(freelancerId, 'deadlineReminder');
  if (!shouldSend) return;

  const freelancer = await prisma.user.findUnique({ where: { id: freelancerId }, select: { telegramId: true } });
  if (!freelancer) return;

  const title = "⏰ Muddat yaqinlashmoqda!";
  const text = `<b>"${taskTitle}"</b> vazifasini topshirish muddati tugashiga 24 soatdan kam vaqt qoldi.`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/${env.BOT_USERNAME}/app?startapp=task_${taskId}` } }]];

  await sendTelegramMessage(freelancer.telegramId.toString(), text, keyboard);

  if (pushToken) {
    await sendPushNotification(pushToken, title, text.replace(/<[^>]*>?/gm, ''), { taskId, type: 'deadline' });
  }
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

  if (task.freelancer && await shouldSendNotification(task.freelancer.id, 'taskStatusChanged')) {
    await sendTelegramMessage(task.freelancer.telegramId.toString(), msg);
  }
  if (task.client && await shouldSendNotification(task.client.id, 'taskStatusChanged')) {
    await sendTelegramMessage(task.client.telegramId.toString(), msg);
  }
}

async function disputeOpened(task, dispute) {
  const msgClient = `⚠️ <b>Nizo ochildi</b>\n\n<b>"${task.title}"</b> vazifasi bo'yicha nizo ochildi. Admin tez orada ko'rib chiqadi.`;
  const msgAdmin = `🚨 <b>Yangi nizo!</b>\n\nVazifa ID: ${task.id}\nOchuvchi ID: ${dispute.openedByUserId}\nSabab: ${dispute.reason}`;

  if (task.client && await shouldSendNotification(task.client.id, 'taskStatusChanged')) {
    await sendTelegramMessage(task.client.telegramId.toString(), msgClient);
  }
  if (task.freelancer && await shouldSendNotification(task.freelancer.id, 'taskStatusChanged')) {
    await sendTelegramMessage(task.freelancer.telegramId.toString(), msgClient);
  }
  // Optional: send to admin channel or all admins
}

async function disputeResolved(task, dispute, winner) {
  const msg = `⚖️ <b>Nizo hal qilindi</b>\n\n<b>"${task.title}"</b> vazifasi bo'yicha nizo <b>${winner === 'CLIENT' ? 'MIJOZ' : 'IJROCHI'}</b> foydasiga hal qilindi.\n\nIzoh: ${dispute.adminNotes || 'Izohsiz'}`;
  
  if (task.client && await shouldSendNotification(task.client.id, 'taskStatusChanged')) {
    await sendTelegramMessage(task.client.telegramId.toString(), msg);
  }
  if (task.freelancer && await shouldSendNotification(task.freelancer.id, 'taskStatusChanged')) {
    await sendTelegramMessage(task.freelancer.telegramId.toString(), msg);
  }
}

async function taskCompleted(task) {
  const msgFreelancer = `✅ <b>Vazifa qabul qilindi</b>\n\n<b>"${task.title}"</b> vazifasi muvaffaqiyatli qabul qilindi! To'lov o'tkaziladi.`;
  const msgClient = `✅ <b>Vazifa yakunlandi</b>\n\n<b>"${task.title}"</b> vazifasi yakunlandi. Hamkorlik uchun rahmat!`;
  
  if (task.freelancer && await shouldSendNotification(task.freelancer.id, 'taskStatusChanged')) {
    sendTelegramMessage(task.freelancer.telegramId.toString(), msgFreelancer).catch(e => logger.error(e));
  }
  if (task.client && await shouldSendNotification(task.client.id, 'taskStatusChanged')) {
    sendTelegramMessage(task.client.telegramId.toString(), msgClient).catch(e => logger.error(e));
  }
}

async function revisionRequested(task, note) {
  const msg = `🔄 <b>Qayta ishlash so'raldi</b>\n\n<b>"${task.title}"</b> vazifasini mijoz qayta ishlashga qaytardi.\n\nIzoh: ${note || 'Izohsiz'}`;
  if (task.freelancer && await shouldSendNotification(task.freelancer.id, 'taskStatusChanged')) {
    await sendTelegramMessage(task.freelancer.telegramId.toString(), msg);
  }
}

async function smartMatchNotify(freelancer, task) {
  const text = `🎯 <b>Sizga mos yangi ish chiqdi!</b>\n\n<b>"${task.title}"</b>\nKategoriya: ${task.category}\nNarx: ${task.priceMin} - ${task.priceMax} so'm\n\nVIP mutaxassis bo'lganingiz uchun sizga ushbu xabar hammadan oldin yuborildi. Darhol taklif qoldiring!`;
  const keyboard = [[{ text: "Vazifani ko'rish", web_app: { url: `https://t.me/${env.BOT_USERNAME}/app?startapp=task_${task.id}` } }]];
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
