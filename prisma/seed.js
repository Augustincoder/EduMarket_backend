// prisma/seed.js
// Database seeder for EduMarket local development.
// Seeds mock users, tasks, bids, and reviews.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding boshlanmoqda...');

  // 1. Clear existing data
  console.log('Eski ma\'lumotlarni o\'chirish...');
  await prisma.review.deleteMany({});
  await prisma.bid.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.savedTask.deleteMany({});
  await prisma.gig.deleteMany({});
  await prisma.portfolioItem.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  console.log('Mock foydalanuvchilarni yaratish...');
  
  // User 1: The Active User (ProFix)
  const userProFix = await prisma.user.create({
    data: {
      telegramId: BigInt('2014973670'),
      username: 'profix_dev',
      fullname: 'ProFix User',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'ADMIN',
      isVip: true,
      vipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days VIP
      bio: 'Full-stack dasturchi va talaba. Barcha turdagi murakkab vazifalarni sifatli bajarib beraman.',
      skills: ['Konspekt', 'Slayd', 'Tarjima', 'Dasturlash'],
      badge: 'PRO',
      ratingSum: 24,
      ratingCount: 5,
      completionRate: 98,
      avgResponseHrs: 0.5,
      referralCode: 'profix77',
      lastIpAddress: '127.0.0.1',
    }
  });

  // User 2: Mock Browser Test User
  const userTest = await prisma.user.create({
    data: {
      telegramId: BigInt('99999999'),
      username: 'testuser',
      fullname: 'Test User',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'USER',
      isVip: false,
      bio: 'EduMarket sinov foydalanuvchisi. Vazifalar berib boraman.',
      skills: ['Matn terish', 'Referat'],
      badge: 'YANGI',
      ratingSum: 5,
      ratingCount: 1,
      completionRate: 100,
      avgResponseHrs: 1.2,
      referralCode: 'test999',
      lastIpAddress: '127.0.0.1',
    }
  });

  // User 3: Jasur Bek
  const userJasur = await prisma.user.create({
    data: {
      telegramId: BigInt('11111111'),
      username: 'jasur_konspekt',
      fullname: 'Jasur Bek',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'USER',
      isVip: true,
      vipExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      bio: 'O\'zMU talabasiman. Chiroyli konspekt va referatlar yozish bo\'yicha mutaxassis.',
      skills: ['Konspekt', 'Referat', 'Husnihat'],
      badge: 'ISHONCHLI',
      ratingSum: 48,
      ratingCount: 10,
      completionRate: 95,
      avgResponseHrs: 0.8,
      referralCode: 'jasur12',
    }
  });

  // User 4: Dilnoza Ali
  const userDilnoza = await prisma.user.create({
    data: {
      telegramId: BigInt('22222222'),
      username: 'dilnoza_slides',
      fullname: 'Dilnoza Ali',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'USER',
      isVip: false,
      bio: 'Dizayner. PowerPoint va Canva-da professional darajada slaydlar tayyorlab beraman.',
      skills: ['Slayd', 'Dizayn', 'Taqdimot'],
      badge: 'ELITE',
      ratingSum: 15,
      ratingCount: 3,
      completionRate: 100,
      avgResponseHrs: 0.3,
      referralCode: 'dilnoza7',
    }
  });

  // User 5: Sardor Qodir
  const userSardor = await prisma.user.create({
    data: {
      telegramId: BigInt('33333333'),
      username: 'sardor_translator',
      fullname: 'Sardor Qodir',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'USER',
      isVip: false,
      bio: 'Ingliz va rus tillaridan o\'zbek tiliga professional tarjima qilaman. IELTS 7.5.',
      skills: ['Tarjima', 'Ingliz tili', 'Rus tili'],
      badge: 'PRO',
      ratingSum: 38,
      ratingCount: 8,
      completionRate: 90,
      avgResponseHrs: 1.5,
      referralCode: 'sardor_tr',
    }
  });

  console.log('Foydalanuvchilar muvaffaqiyatli yaratildi.');

  // 3. Create Gigs (Services by freelancers)
  console.log('Mock xizmatlarni (gigs) yaratish...');
  await prisma.gig.createMany({
    data: [
      {
        freelancerId: userProFix.id,
        title: 'Professional veb-sayt va mini-app yaratish',
        description: 'React, Node.js va Telegram Mini App texnologiyalarida murakkab loyihalarni to\'liq noldan yozib beraman.',
        price: 250000,
        deliveryDays: 5,
        isActive: true,
      },
      {
        freelancerId: userDilnoza.id,
        title: '15 varaqdan iborat zamonaviy slayd tayyorlash',
        description: 'Mavzuni to\'liq o\'rganib, Canva va PowerPoint dasturlarida ajoyib vizual dizaynli taqdimot tayyorlab beraman.',
        price: 45000,
        deliveryDays: 2,
        isActive: true,
      },
      {
        freelancerId: userSardor.id,
        title: 'Inglizcha ilmiy maqolalarni o\'zbekchaga tarjima qilish',
        description: "Ilmiy va badiiy matnlarni so'zma-so'z emas, mazmunli va grammatik to'g'ri tarjima qilib beraman.",
        price: 30000,
        deliveryDays: 1,
        isActive: true,
      }
    ]
  });

  // 4. Create Tasks (topshiriqlar)
  console.log('Mock topshiriqlarni (tasks) yaratish...');

  // Task 1: OPEN - Client: Jasur, Title: Matematik analizdan konspekt
  const task1 = await prisma.task.create({
    data: {
      clientId: userJasur.id,
      category: 'KONSPEKT',
      title: 'Matematik analiz fanidan 5 ta ma\'ruza konspektini yozish',
      description: 'Matematik analiz fanining integral hisobi bo\'limidan 5 ta ma\'ruzani chiroyli va tushunarli husnihat bilan yozish kerak. Konspekt rasmini PDF shaklida yuborish lozim. Sifatli va tezkor yozilsa bonus beriladi.',
      priceMin: 20000,
      priceMax: 40000,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'OPEN',
      isUrgent: false,
    }
  });

  // Task 2: OPEN - Client: Test User, Title: Iqtisodiyot referat
  const task2 = await prisma.task.create({
    data: {
      clientId: userTest.id,
      category: 'REFERAT',
      title: 'Raqamli iqtisodiyot va uning istiqbollari mavzusida referat',
      description: 'Raqamli iqtisodiyot mavzusida kamida 20 varaqdan iborat referat yozish kerak. Reja, kirish, 3 ta bob, xulosa va foydalanilgan adabiyotlar bo\'lishi shart. Plagiatga tekshiriladi.',
      priceMin: 30000,
      priceMax: 60000,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      isUrgent: false,
    }
  });

  // Task 3: OPEN - Client: Dilnoza, Title: Fizikadan slayd (Urgent)
  const task3 = await prisma.task.create({
    data: {
      clientId: userDilnoza.id,
      category: 'SLAYD',
      title: 'Yarim o\'tkazgichlar fizikasidan slayd tayyorlash',
      description: 'Mavzu: Yarim o\'tkazgichlar fizikasi va ularni texnikada qo\'llanilishi. Slayd 12-15 varaq bo\'lishi, animatsiya va grafikalar bilan chiroyli bezatilishi kerak. Juda shoshilinch!',
      priceMin: 35000,
      priceMax: 50000,
      deadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours (urgent)
      status: 'OPEN',
      isUrgent: true,
      rushFee: 8000,
    }
  });

  // Task 4: OPEN - Client: Sardor, Title: Tarjima inglizcha
  const task4 = await prisma.task.create({
    data: {
      clientId: userSardor.id,
      category: 'TARJIMA',
      title: 'Tibbiyotga oid 3 varaqli maqolani inglizchaga tarjima qilish',
      description: 'Matn kardiologiya sohasi haqida. Tibbiy terminlar to\'g\'ri tarjima qilinishi shart. Tarjimondan tajriba talab qilinadi.',
      priceMin: 50000,
      priceMax: 80000,
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      isUrgent: false,
    }
  });

  // Task 5: IN_PROGRESS - Client: Jasur, Freelancer: ProFix (You)
  const task5 = await prisma.task.create({
    data: {
      clientId: userJasur.id,
      freelancerId: userProFix.id,
      category: 'KURS_ISHI',
      title: 'C++ OOP mavzusida amaliy kurs ishi dasturi',
      description: 'Kutubxona boshqaruv tizimi loyihasini C++ tilida OOP printsiplari (merosxo\'rlik, polimorfizm) yordamida dasturini yozish va unga 25 varaqli tushuntirish xati (kurs ishi hujjati) yozish.',
      priceMin: 120000,
      priceMax: 180000,
      agreedPrice: 150000,
      deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      assignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Assigned 1 day ago
      inProgressAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    }
  });

  // Task 6: IN_PROGRESS - Client: ProFix (You), Freelancer: Test User
  const task6 = await prisma.task.create({
    data: {
      clientId: userProFix.id,
      freelancerId: userTest.id,
      category: 'KONSPEKT',
      title: 'Kimyo fanidan laboratoriya ishlarini daftarga ko\'chirish',
      description: 'Tayyor laboratoriya matnlarini rasmdan daftarga chiroyli yozuv bilan ko\'chirish kerak. Hammasi bo\'lib 8 ta laboratoriya ishi bor.',
      priceMin: 25000,
      priceMax: 40000,
      agreedPrice: 35000,
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      assignedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      inProgressAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    }
  });

  // Task 7: IN_REVIEW - Client: Dilnoza, Freelancer: ProFix (You)
  const task7 = await prisma.task.create({
    data: {
      clientId: userDilnoza.id,
      freelancerId: userProFix.id,
      category: 'TARJIMA',
      title: 'Sayt menyularini rus tiliga lokalizatsiya qilish',
      description: 'EduMarket platformasining 120 ta so\'zdan iborat o\'zbekcha menyu va tugma matnlarini rus tiliga professional tarjima qilish.',
      priceMin: 15000,
      priceMax: 25000,
      agreedPrice: 20000,
      deadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // Deadline passed, already in review
      status: 'IN_REVIEW',
      assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      inProgressAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      inReviewAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    }
  });

  // Task 8: COMPLETED - Client: Jasur, Freelancer: ProFix (You)
  const task8 = await prisma.task.create({
    data: {
      clientId: userJasur.id,
      freelancerId: userProFix.id,
      category: 'SLAYD',
      title: 'Tarix fanidan buyuk jahongirlar haqida taqdimot',
      description: 'Amir Temur va Bobur hayoti hamda harbiy yurishlari haqida 20 varaqli slayd.',
      priceMin: 30000,
      priceMax: 50000,
      agreedPrice: 40000,
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'COMPLETED',
      assignedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      inProgressAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
  });

  console.log('Topshiriqlar muvaffaqiyatli yaratildi.');

  // 5. Create Bids (Takliflar)
  console.log('Mock takliflarni (bids) yaratish...');
  
  // Bids on Task 1 (Matematik analiz)
  await prisma.bid.createMany({
    data: [
      {
        taskId: task1.id,
        freelancerId: userProFix.id,
        message: 'Matematika yo\'nalishida o\'qiyman. Konspektlarni chiroyli husnihat bilan va xatolarsiz yozib beraman.',
        proposedPrice: 30000,
        isAccepted: false,
      },
      {
        taskId: task1.id,
        freelancerId: userSardor.id,
        message: 'Tezda yozib tayyorlab bera olaman.',
        proposedPrice: 25000,
        isAccepted: false,
      }
    ]
  });

  // Bids on Task 2 (Iqtisodiyot referat)
  await prisma.bid.createMany({
    data: [
      {
        taskId: task2.id,
        freelancerId: userProFix.id,
        message: 'Menda ushbu mavzu bo\'yicha tayyor manbalar mavjud. 2 kunda plagiat foizi juda past bo\'lgan sifatli referat yozib topshiraman.',
        proposedPrice: 50000,
        isAccepted: false,
      },
      {
        taskId: task2.id,
        freelancerId: userJasur.id,
        message: 'Referatingizni talabga moslab, chiroyli qilib yozib beraman.',
        proposedPrice: 40000,
        isAccepted: false,
      }
    ]
  });

  // Bids on Task 3 (Fizika slayd)
  await prisma.bid.createMany({
    data: [
      {
        taskId: task3.id,
        freelancerId: userProFix.id,
        message: 'Fizika sohasini yaxshi bilaman va ajoyib slaydlar qila olaman. Deadlinegacha tayyor bo\'ladi.',
        proposedPrice: 48000,
        isAccepted: false,
      }
    ]
  });

  // Bids on Task 4 (Tibbiyot tarjima)
  await prisma.bid.createMany({
    data: [
      {
        taskId: task4.id,
        freelancerId: userProFix.id,
        message: 'Ingliz tilidan maqolalar tarjima qilish tajribam 2 yildan ortiq. Tibbiy atamalar to\'g\'ri tarjima qilinishiga kafolat beraman.',
        proposedPrice: 70000,
        isAccepted: false,
      }
    ]
  });

  console.log('Takliflar muvaffaqiyatli yaratildi.');

  // 6. Create Chat Messages
  console.log('Mock chat xabarlarini yaratish...');
  await prisma.chatMessage.createMany({
    data: [
      {
        taskId: task5.id,
        senderId: userJasur.id,
        content: 'Salom, topshiriqni qabul qilib olganingiz uchun rahmat! Kod qachonga tayyor bo\'ladi?',
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      },
      {
        taskId: task5.id,
        senderId: userProFix.id,
        content: 'Salom Jasur, OOP tuzilmasi tayyor bo\'ldi. Kutubxona funksiyalarini tugatib, tushuntirish xati bilan ertaga kechgacha yuboraman.',
        createdAt: new Date(Date.now() - 19 * 60 * 60 * 1000),
        isRead: true,
      },
      {
        taskId: task5.id,
        senderId: userJasur.id,
        content: 'Ajoyib, kutaman. Rahmat!',
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
        isRead: true,
      }
    ]
  });

  // 7. Create Reviews
  console.log('Mock sharhlarni (reviews) yaratish...');
  
  // Review given to ProFix by Jasur for Task 8
  await prisma.review.create({
    data: {
      taskId: task8.id,
      fromUserId: userJasur.id,
      toUserId: userProFix.id,
      rating: 5,
      comment: 'Taqdimot juda chiroyli va o\'z vaqtida topshirildi. Ish sifatiga gap bo\'lishi mumkin emas. Rahmat!',
      isCountedInRating: true,
    }
  });

  console.log('Seeding muvaffaqiyatli yakunlandi!');
}

main()
  .catch((e) => {
    console.error('Seeding jarayonida xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
