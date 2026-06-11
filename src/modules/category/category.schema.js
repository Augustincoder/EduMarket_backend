const { z } = require('zod');

exports.createCategorySchema = z.object({
  value: z.string().min(2, "Kategoriya kodi (value) kamida 2 ta belgi bo'lishi kerak"),
  label: z.string().min(2, "Kategoriya nomi (label) kamida 2 ta belgi bo'lishi kerak"),
  emoji: z.string().min(1, "Iltimos emoji tanlang"),
  colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Yaroqli HEX rang kiriting'),
  formType: z.enum(['ACADEMIC', 'PROGRAMMING', 'TRANSLATION', 'DESIGN', 'GENERAL']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  skills: z.array(z.string()).optional()
});

exports.updateCategorySchema = z.object({
  label: z.string().min(2, "Kategoriya nomi (label) kamida 2 ta belgi bo'lishi kerak").optional(),
  emoji: z.string().optional(),
  colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Yaroqli HEX rang kiriting').optional(),
  formType: z.enum(['ACADEMIC', 'PROGRAMMING', 'TRANSLATION', 'DESIGN', 'GENERAL']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  skills: z.array(z.string()).optional()
});
