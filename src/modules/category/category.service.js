const prisma = require('../../config/prisma');

// In-Memory Cache for Categories
let categoriesCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const clearCache = () => {
  categoriesCache = null;
};

exports.getCategories = async (forceRefresh = false) => {
  if (!forceRefresh && categoriesCache && lastCacheUpdate && (Date.now() - lastCacheUpdate < CACHE_TTL)) {
    return categoriesCache;
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [
      { isTrending: 'desc' },
      { sortOrder: 'asc' },
      { label: 'asc' }
    ],
    include: {
      skills: true
    }
  });

  categoriesCache = categories;
  lastCacheUpdate = Date.now();
  return categories;
};

exports.getAllCategoriesAdmin = async () => {
  return await prisma.category.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { label: 'asc' }
    ],
    include: {
      skills: true,
      _count: {
        select: { skills: true } // Since tasks use string, we can't count relations natively without raw query. Let's just count skills.
      }
    }
  });
};

exports.createCategory = async (data) => {
  const { skills, ...categoryData } = data;
  
  const newCategory = await prisma.category.create({
    data: {
      ...categoryData,
      skills: skills ? {
        create: skills.map(name => ({ name }))
      } : undefined
    },
    include: { skills: true }
  });

  clearCache();
  return newCategory;
};

exports.updateCategory = async (id, data) => {
  const { skills, ...categoryData } = data;

  const updatePayload = {
    ...categoryData
  };

  if (skills) {
    await prisma.skill.deleteMany({ where: { categoryId: id } });
    updatePayload.skills = {
      create: skills.map(name => ({ name }))
    };
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: updatePayload,
    include: { skills: true }
  });

  clearCache();
  return updatedCategory;
};

exports.deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return;

  const [taskCount, gigCount] = await Promise.all([
    prisma.task.count({ where: { category: category.value } }),
    prisma.gig.count({ where: { category: category.value } })
  ]);

  if (taskCount > 0 || gigCount > 0) {
    throw new Error(`Kategoriyani o'chirib bo'lmaydi: ${taskCount} ta vazifa va ${gigCount} ta xizmat ushbu kategoriyaga biriktirilgan. Buning o'rniga kategoriyani faolsizlantiring (Soft-disable).`);
  }

  await prisma.category.delete({ where: { id } });
  clearCache();
};

exports.toggleCategoryStatus = async (id, isActive) => {
  const updated = await prisma.category.update({
    where: { id },
    data: { isActive }
  });
  clearCache();
  return updated;
};
