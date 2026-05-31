const { getBot } = require('../../config/bot');
const env = require('../../config/env');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Upload a file to Telegram's private channel and return its file_id
 * 
 * @param {Buffer} buffer - File data
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {string} Telegram file_id
 */
async function uploadFileToTelegram(buffer, filename, mimeType) {
  const bot = getBot();
  
  if (!env.BOT_STORAGE_CHANNEL_ID || env.BOT_STORAGE_CHANNEL_ID === '-100xxxxxxxxxx') {
    throw new AppError('Telegram storage channel sozlanmagan', 500);
  }

  try {
    // Send document to the private storage channel
    const message = await bot.sendDocument(
      env.BOT_STORAGE_CHANNEL_ID,
      buffer,
      {},
      { filename, contentType: mimeType }
    );

    // Return the file_id of the uploaded document
    return message.document.file_id;
  } catch (err) {
    throw new AppError(`Fayl yuklashda xatolik: ${err.message}`, 500);
  }
}

/**
 * Get file link from Telegram by file_id
 * 
 * @param {string} fileId - Telegram file_id
 * @returns {string} Temporary download URL (valid for 1 hour)
 */
async function getFileUrl(fileId) {
  try {
    const bot = getBot();
    const file = await bot.getFile(fileId);
    
    // Construct the download URL
    // Format: https://api.telegram.org/file/bot<token>/<file_path>
    const fileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
    
    return fileUrl;
  } catch (err) {
    throw new AppError('Faylni topib bo\'lmadi', 404);
  }
}

/**
 * Send an existing file directly to a user's Telegram
 * Useful for admin forwarding receipts or sensitive documents
 * 
 * @param {string} telegramId - User's Telegram ID
 * @param {string} fileId - Telegram file_id
 * @param {string} caption - Optional text attached to the file
 */
async function sendFileToUser(telegramId, fileId, caption = '') {
  try {
    const bot = getBot();
    await bot.sendDocument(telegramId, fileId, { caption });
    return true;
  } catch (err) {
    throw new AppError(`Faylni jo'natib bo'lmadi: ${err.message}`, 500);
  }
}

module.exports = {
  uploadFileToTelegram,
  getFileUrl,
  sendFileToUser
};
