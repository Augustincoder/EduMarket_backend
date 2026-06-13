const { z } = require('zod');

const sendMessageSchema = z.object({
  type: z.enum(['TEXT', 'FILE', 'SYSTEM_EVENT']).optional().default('TEXT'),
  content: z.string().max(2000, "Xabar 2000 ta belgidan oshmasligi kerak").trim().optional().nullable(),
  fileId: z.string().optional().nullable(),
  fileType: z.enum(['photo', 'document', 'video', 'voice']).optional().nullable(),
  fileName: z.string().optional().nullable(),
  isSecureFile: z.boolean().optional().default(false),
  replyToId: z.string().optional().nullable(),
}).refine(data => (data.content && data.content.trim().length > 0) || data.fileId, {
  message: "Xabar matni yoki fayl yuborilishi shart",
  path: ["content"]
});

const editMessageSchema = z.object({
  content: z.string().max(2000, "Xabar 2000 ta belgidan oshmasligi kerak").trim().min(1, "Xabar bo'sh bo'lmasligi kerak"),
});

const createGroupSchema = z.object({
  name: z.string().min(2, "Guruh nomi kamida 2ta belgi bo'lishi kerak").max(50, "Guruh nomi 50 belgidan oshmasligi kerak").trim(),
  avatarUrl: z.string().url("Noto'g'ri rasm URL manzili").optional().nullable(),
});

const updateGroupSchema = z.object({
  name: z.string().min(2).max(50).trim().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

const inviteUserSchema = z.object({
  targetUserId: z.string().min(1, "Foydalanuvchi ID talab qilinadi"),
});

module.exports = {
  sendMessageSchema,
  editMessageSchema,
  createGroupSchema,
  updateGroupSchema,
  inviteUserSchema
};
