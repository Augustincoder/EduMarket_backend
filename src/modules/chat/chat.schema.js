const { z } = require('zod');

const sendMessageSchema = z.object({
  content: z.string().max(2000, "Xabar 2000 ta belgidan oshmasligi kerak").trim().optional().nullable(),
  fileId: z.string().optional().nullable(),
  fileType: z.enum(['photo', 'document', 'video', 'voice']).optional().nullable(),
  fileName: z.string().optional().nullable(),
  replyToId: z.string().optional().nullable(),
}).refine(data => (data.content && data.content.trim().length > 0) || data.fileId, {
  message: "Xabar matni yoki fayl yuborilishi shart",
  path: ["content"]
});

const editMessageSchema = z.object({
  content: z.string().max(2000, "Xabar 2000 ta belgidan oshmasligi kerak").trim().min(1, "Xabar bo'sh bo'lmasligi kerak"),
});

module.exports = {
  sendMessageSchema,
  editMessageSchema
};
