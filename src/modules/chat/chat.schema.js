const { z } = require('zod');

const sendMessageSchema = z.object({
  message: z.string().min(1, "Xabar bo'sh bo'lishi mumkin emas").max(2000, "Xabar 2000 ta belgidan oshmasligi kerak").trim()
});

module.exports = {
  sendMessageSchema
};
