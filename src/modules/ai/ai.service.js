const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const { Groq } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseTaskBrief(text) {
  try {
const prompt = `Siz EduMarket (talabalar uchun mikro-xizmatlar birjasi) platformasi uchun kuchli AI yordamchisisiz. 
Mijoz o'z vazifasini qisqa yoki tartibsiz matn ko'rinishida yozadi. Sizning vazifangiz bu matnni tahlil qilib, tizim uchun mukammal va aniq JSON formatida strukturalashdir.

Quyidagi maydonlarni ajratib oling va FAQAT yaroqli JSON formatida qaytaring:
{
  "title": "Vazifaning qisqa va aniq sarlavhasi (max 50 belgi). Masalan: 'Matematikadan 5 ta misol yechish'",
  "description": "Batafsil, professional tilda yozilgan ta'rif. Foydalanuvchi kiritgan hamma shartlarni (til, fan, hajm, talablar) qamrab oling. Agar matn juda qisqa bo'lsa, mantiqan kengaytirib, to'liq texnik topshiriq (TZ) shakliga keltiring.",
  "category": "Quyidagilardan eng mosini tanlang: 'academic_writing', 'design_graphics', 'programming_tech', yoki 'other'",
  "priceMin": integer (UZS da, masalan 50000. Agar narx yozilmagan bo'lsa, shu tipdagi vazifaning O'zbekistondagi o'rtacha bozor narxining pastki chegarasini yozing),
  "priceMax": integer (UZS da, masalan 150000. Agar narx yozilmagan bo'lsa, o'rtacha bozor narxining yuqori chegarasini yozing),
  "deadlineDays": integer (Vazifani bajarish uchun necha kun kerakligi. Agar yozilmagan bo'lsa, mantiqan taxmin qiling, masalan, kichik referat uchun 2-3 kun)
}

QATIY TALAB: Qo'shimcha matn, izoh yoki tushuntirish YOZMANG! Faqatgina bitta toza JSON obyekti qaytaring. Parsing xatosiz ishlashi uchun kalit so'zlar va qiymatlar to'g'ri qo'shtirnoqqa olinganligiga ishonch hosil qiling.

Mijoz vazifasi: "${text}"`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    const json = JSON.parse(content);
    return json;
  } catch (error) {
    logger.error(`Groq AI parseTaskBrief xatosi: ${error.message}`);
    throw new Error('AI orqali tahlil qilishda xatolik yuz berdi', { cause: error });
  }
}

/**
 * Perform a real-time (or cached) skill gap analysis for the platform and the freelancer.
 */
async function generateLearningCompass(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reviewsReceived: {
          select: { rating: true, task: { select: { category: true } } }
        }
      }
    });

    if (!user) throw new Error('Foydalanuvchi topilmadi');

    // 1. Calculate Micro-performance (Freelancer's Strong and Weak Skills)
    const categoryStats = {};
    for (const review of user.reviewsReceived) {
      if (!review.task) continue;
      const cat = review.task.category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, count: 0 };
      }
      categoryStats[cat].total += review.rating;
      categoryStats[cat].count += 1;
    }

    const strongSkills = [];
    const weakSkills = [];

    for (const [cat, stats] of Object.entries(categoryStats)) {
      const avg = stats.total / stats.count;
      if (avg >= 4.5) {
        strongSkills.push(cat);
      } else if (avg <= 3.5) {
        weakSkills.push(cat);
      }
    }

    // 2. Calculate Macro-platform demand (Global Market Gaps)
    // For MVP we just use an aggregate of open tasks vs bids.
    const tasksAggregation = await prisma.task.groupBy({
      by: ['category'],
      where: {
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      _count: {
        id: true,
      }
    });

    // In a real production scale, we'd cache this globally rather than calculate per-request.
    // We mock the supply side for the sake of the feature, finding categories with high task count.
    const demandGaps = tasksAggregation
      .filter(t => t._count.id > 0)
      .map(t => ({
        category: t.category,
        demandLevel: t._count.id > 10 ? 'HIGH' : 'MEDIUM'
      }))
      .sort((a, b) => b.demandLevel.localeCompare(a.demandLevel));

    // 3. Match Suggested Courses based on weaknesses and demand gaps
    const suggestedCourses = [];
    if (weakSkills.length > 0 || demandGaps.length > 0) {
      // Mock static courses mapping. In real life, fetch from an LMS or course API.
      const courseCatalog = {
        'KONSPEKT': { title: 'Mukammal konspekt yozish sirlari', url: '#', description: 'Talab yuqori bo\'lgan konspektlar yozishni o\'rganing.' },
        'TARJIMA': { title: 'Sinxron va yozma tarjima amaliyoti', url: '#', description: 'Daromadli tarjimon bo\'lish bo\'yicha master-klass.' },
        'KURS_ISHI': { title: 'Diplom va Kurs ishlarini standartlash', url: '#', description: 'Akademik talablarga to\'liq mos kurs ishlari yaratish.' },
      };

      const targets = new Set([...weakSkills, ...demandGaps.map(d => d.category)]);
      
      for (const target of targets) {
        if (courseCatalog[target]) {
          suggestedCourses.push(courseCatalog[target]);
        }
      }
    }

    // 4. Upsert into LearningPath cache
    const learningPath = await prisma.learningPath.upsert({
      where: { userId },
      update: {
        weakSkills,
        strongSkills,
        demandGaps,
        suggestedCourses
      },
      create: {
        userId,
        weakSkills,
        strongSkills,
        demandGaps,
        suggestedCourses
      }
    });

    return learningPath;
  } catch (error) {
    logger.error(`AI Learning Compass xatosi: ${error.message}`);
    throw error;
  }
}

/**
 * Background job wrapper for Nightly Aggregation
 */
async function runNightlyAggregation() {
  logger.info('Starting nightly Learning Compass aggregation...');
  // Logic to update all active freelancers learning paths.
  // We can fetch active freelancers and call `generateLearningCompass` for each.
  // For safety, we only update freelancers active in the last 7 days.
}

module.exports = {
  generateLearningCompass,
  runNightlyAggregation,
  parseTaskBrief
};
