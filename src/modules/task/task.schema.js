const { z } = require('zod');

// Schema for creating a new task
const createTaskSchema = z.object({
  category: z.enum(['KONSPEKT', 'SLAYD', 'TARJIMA', 'KURS_ISHI', 'REFERAT', 'LABORATORIYA', 'BOSHQA'], {
    required_error: 'Kategoriya tanlash majburiy',
    invalid_type_error: 'Noto\'g\'ri kategoriya'
  }),
  title: z.string()
    .min(10, 'Sarlavha kamida 10 ta belgidan iborat bo\'lishi kerak')
    .max(200, 'Sarlavha 200 ta belgidan oshmasligi kerak'),
  description: z.string()
    .min(20, 'Batafsil ma\'lumot kamida 20 ta belgidan iborat bo\'lishi kerak')
    .max(2000, 'Batafsil ma\'lumot 2000 ta belgidan oshmasligi kerak'),
  priceMin: z.number().int().min(1000, 'Minimal narx 1000 so\'m'),
  priceMax: z.number().int().min(1000, 'Maksimal narx 1000 so\'m'),
  deadline: z.string().datetime({ message: 'Muddat ISO 8601 formatida bo\'lishi kerak' }),
  attachmentFileIds: z.array(z.string()).max(5, 'Maksimal 5 ta fayl yuklash mumkin').optional(),
  
  // Phase 14 enhancements
  isUrgent: z.boolean().optional().default(false),
}).refine(data => data.priceMax >= data.priceMin, {
  message: 'Maksimal narx minimal narxdan kam bo\'lishi mumkin emas',
  path: ['priceMax']
}).refine(data => new Date(data.deadline) > new Date(), {
  message: 'Muddat kelajakda bo\'lishi kerak',
  path: ['deadline']
});

// Schema for listing tasks (query params)
const listTasksSchema = z.object({
  cursor: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  category: z.enum(['KONSPEKT', 'SLAYD', 'TARJIMA', 'KURS_ISHI', 'REFERAT', 'LABORATORIYA', 'BOSHQA']).optional(),
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELED', 'DISPUTED']).optional(),
  
  // Phase 14 Advanced search
  query: z.string().optional(),
  minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
  maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
}).refine(data => {
  if (data.minPrice && data.maxPrice) {
    return data.maxPrice >= data.minPrice;
  }
  return true;
}, {
  message: 'maxPrice minPrice dan kam bo\'lishi mumkin emas',
  path: ['maxPrice']
});

module.exports = {
  createTaskSchema,
  listTasksSchema
};
