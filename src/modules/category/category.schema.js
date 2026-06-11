const { z } = require('zod');

exports.createCategorySchema = z.object({
  body: z.object({
    value: z.string().min(2),
    label: z.string().min(2),
    emoji: z.string(),
    colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Yaroqli HEX rang kiriting'),
    formType: z.enum(['ACADEMIC', 'PROGRAMMING', 'TRANSLATION', 'DESIGN', 'GENERAL']).optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    skills: z.array(z.string()).optional()
  })
});

exports.updateCategorySchema = z.object({
  body: z.object({
    label: z.string().min(2).optional(),
    emoji: z.string().optional(),
    colorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    formType: z.enum(['ACADEMIC', 'PROGRAMMING', 'TRANSLATION', 'DESIGN', 'GENERAL']).optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    skills: z.array(z.string()).optional()
  })
});
