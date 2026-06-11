const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  { value: 'REFERAT',      label: 'Referat',       emoji: '📄', colorHex: '#4F46E5', formType: 'ACADEMIC' },
  { value: 'SLAYD',        label: 'Slayd',         emoji: '📊', colorHex: '#F59E0B', formType: 'ACADEMIC' },
  { value: 'TARJIMA',      label: 'Tarjima',       emoji: '🌐', colorHex: '#10B981', formType: 'TRANSLATION' },
  { value: 'KURS_ISHI',    label: 'Kurs ishi',     emoji: '📚', colorHex: '#3B82F6', formType: 'ACADEMIC' },
  { value: 'KONSPEKT',     label: 'Konspekt',      emoji: '📝', colorHex: '#8B5CF6', formType: 'ACADEMIC' },
  { value: 'LABORATORIYA', label: 'Laboratoriya',  emoji: '🔬', colorHex: '#EC4899', formType: 'ACADEMIC' },
  { value: 'DASTURLASH',   label: 'Dasturlash',    emoji: '💻', colorHex: '#06B6D4', formType: 'PROGRAMMING' },
  { value: 'DIZAYN',       label: 'Dizayn',        emoji: '🎨', colorHex: '#E11D48', formType: 'DESIGN' },
  { value: 'BOSHQA',       label: 'Boshqa',        emoji: '📌', colorHex: '#6B7280', formType: 'GENERAL' },
];

async function main() {
  console.log('Seeding categories...');
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    await prisma.category.upsert({
      where: { value: cat.value },
      update: {},
      create: {
        value: cat.value,
        label: cat.label,
        emoji: cat.emoji,
        colorHex: cat.colorHex,
        formType: cat.formType,
        sortOrder: i + 1,
        isActive: true,
        isTrending: ['KURS_ISHI', 'DASTURLASH', 'TARJIMA'].includes(cat.value)
      }
    });
    console.log(`Seeded: ${cat.label}`);
  }
  console.log('Categories seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
