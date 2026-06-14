const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

/**
 * 1-BOSQICH: GURUHLAR VA A'ZOLARNI BOSHQARISH
 */

// 1vs1 Chat yaratish yoki borini qaytarish
async function getOrCreateDirectChat(userId1, userId2) {
  // Avval bunday chat borligini tekshiramiz
  const existingRoom = await prisma.chatRoom.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId: userId1 } } },
        { participants: { some: { userId: userId2 } } }
      ]
    },
    include: { participants: true }
  });

  if (existingRoom) {
    return existingRoom;
  }

  // Yo'q bo'lsa yangi DIRECT chat yaratamiz
  const newRoom = await prisma.chatRoom.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: userId1, role: 'MEMBER' },
          { userId: userId2, role: 'MEMBER' }
        ]
      }
    },
    include: { participants: true }
  });

  return newRoom;
}

// Task uchun chat xonasini olish yoki yaratish
async function getOrCreateTaskRoom(userId, taskId) {
  // Avval Task ni tekshiramiz va a'zolarni aniqlaymiz
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { collaborators: true }
  });

  if (!task) throw new AppError('Topshiriq topilmadi', 404);

  // Bu foydalanuvchi task'ga aloqadormi?
  const isClient = task.clientId === userId;
  const isFreelancer = task.freelancerId === userId;
  const isCollaborator = task.collaborators.some(c => c.freelancerId === userId);

  if (!isClient && !isFreelancer && !isCollaborator) {
    throw new AppError('Siz ushbu topshiriqning ishtirokchisi emassiz', 403);
  }

  // Avval ushbu taskId uchun xona borligini tekshiramiz
  const existingRoom = await prisma.chatRoom.findFirst({
    where: { taskId },
    include: { participants: true }
  });

  if (existingRoom) {
    // Agar foydalanuvchi hali qo'shilmagan bo'lsa, qo'shib qo'yamiz
    const isParticipant = existingRoom.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      await prisma.chatParticipant.create({
        data: {
          chatRoomId: existingRoom.id,
          userId,
          role: userId === task.clientId ? 'OWNER' : 'MEMBER'
        }
      });
    }
    return existingRoom;
  }

  // Agar room yo'q bo'lsa, uni yaratamiz
  if (!task.freelancerId) {
    throw new AppError('Topshiriq uchun hali ijrochi tanlanmagan', 400);
  }

  const participantsData = [
    { userId: task.clientId, role: 'OWNER' },
    { userId: task.freelancerId, role: 'MEMBER' }
  ];

  task.collaborators.forEach(c => {
    participantsData.push({ userId: c.freelancerId, role: 'MEMBER' });
  });

  const newRoom = await prisma.chatRoom.create({
    data: {
      type: 'TASK_ROOM',
      name: task.title,
      taskId: task.id,
      participants: {
        create: participantsData
      }
    },
    include: { participants: true }
  });

  return newRoom;
}

// Yangi ixtiyoriy guruh yaratish (CUSTOM_GROUP)
async function createCustomGroup(creatorId, name, avatarUrl) {
  if (!name) throw new AppError('Guruh nomi majburiy', 400);

  const room = await prisma.chatRoom.create({
    data: {
      type: 'CUSTOM_GROUP',
      name,
      avatarUrl,
      participants: {
        create: [
          { userId: creatorId, role: 'OWNER' }
        ]
      }
    },
    include: { participants: true }
  });

  return room;
}

// Guruh sozlamalarini o'zgartirish (Faqat OWNER va ADMIN)
async function updateGroupSettings(chatRoomId, requesterId, name, avatarUrl) {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId: requesterId } }
  });

  if (!participant || (participant.role !== 'OWNER' && participant.role !== 'ADMIN')) {
    throw new AppError('Sizda guruh sozlamalarini o\'zgartirish huquqi yo\'q', 403);
  }

  const updatedRoom = await prisma.chatRoom.update({
    where: { id: chatRoomId },
    data: { name, avatarUrl }
  });

  return updatedRoom;
}

// Guruhdan chetlatish (Kick)
async function removeParticipant(chatRoomId, requesterId, targetUserId) {
  if (requesterId === targetUserId) {
    throw new AppError('O\'zingizni chetlashtira olmaysiz, guruhdan chiqish tugmasidan foydalaning', 400);
  }

  const requester = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId: requesterId } }
  });

  const target = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId: targetUserId } }
  });

  if (!target) throw new AppError('Foydalanuvchi guruhda topilmadi', 404);
  if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
    throw new AppError('Ishtirokchini chetlatish uchun huquq yetarli emas', 403);
  }

  // Ownerni faqat owner o'chira oladi (yoki ownerni umuman o'chirib bo'lmaydi)
  if (target.role === 'OWNER') {
    throw new AppError('Guruh yaratuvchisini chetlatib bo\'lmaydi', 403);
  }

  await prisma.chatParticipant.delete({
    where: { id: target.id }
  });

  return true;
}

// O'z xohishi bilan guruhdan chiqish
async function leaveGroup(chatRoomId, userId) {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId } }
  });

  if (!participant) throw new AppError('Siz guruh a\'zosi emassiz', 404);

  await prisma.chatParticipant.delete({
    where: { id: participant.id }
  });

  // Agar guruhda boshqa hech kim qolmagan bo'lsa, guruhni o'chiramiz
  const remainingParticipants = await prisma.chatParticipant.findMany({
    where: { chatRoomId },
    orderBy: { joinedAt: 'asc' }
  });

  if (remainingParticipants.length === 0) {
    await prisma.chatRoom.delete({ where: { id: chatRoomId } });
    return true;
  }

  // Agar chiqib ketgan odam OWNER bo'lsa, boshqa birovga OWNER berish kerak
  if (participant.role === 'OWNER') {
    // Eng birinchi qo'shilgan ADMINni topamiz, bo'lmasa oddiy MEMBERni OWNER qilamiz
    let nextOwner = remainingParticipants.find(p => p.role === 'ADMIN');
    if (!nextOwner) nextOwner = remainingParticipants[0];

    if (nextOwner) {
      await prisma.chatParticipant.update({
        where: { id: nextOwner.id },
        data: { role: 'OWNER' }
      });
    }
  }

  return true;
}

/**
 * 2-BOSQICH: TAKLIFLAR TIZIMI (INVITE SYSTEM)
 */

// Username yoki ism bo'yicha foydalanuvchilarni izlash
async function searchUsersForInvite(query, chatRoomId) {
  if (!query || query.length < 3) {
    return [];
  }

  // Shu guruhda allaqachon bor odamlarni topamiz
  let excludeIds = [];
  if (chatRoomId) {
    const participants = await prisma.chatParticipant.findMany({
      where: { chatRoomId },
      select: { userId: true }
    });
    excludeIds = participants.map(p => p.userId);
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { notIn: excludeIds } },
        { isBanned: false },
        { deletedAt: null },
        {
          OR: [
            { fullname: { contains: query, mode: 'insensitive' } },
            // Agar User modelida username bo'lsa, bu yerga yoziladi.
            // Hozirgi modelda fullname bor, shu bo'yicha qidiramiz
          ]
        }
      ]
    },
    select: { id: true, fullname: true, avatarUrl: true },
    take: 10
  });

  return users;
}

// Guruhga taklif yuborish
async function sendInvite(chatRoomId, inviterId, inviteeId) {
  // Inviter ruxsatini tekshiramiz
  const inviter = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId: inviterId } }
  });

  if (!inviter) throw new AppError('Siz ushbu guruh a\'zosi emassiz', 403);

  // Allaqachon a'zo bo'lmasligi kerak
  const existingParticipant = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId: inviteeId } }
  });
  if (existingParticipant) throw new AppError('Bu foydalanuvchi allaqachon guruhda', 400);

  // Allaqachon PENDING taklif bormi?
  const existingInvite = await prisma.chatInvite.findUnique({
    where: { chatRoomId_inviteeId: { chatRoomId, inviteeId } }
  });

  if (existingInvite) {
    if (existingInvite.status === 'PENDING') throw new AppError('Taklif allaqachon yuborilgan', 400);
    
    // Agar REJECTED bo'lsa yangilaymiz
    return prisma.chatInvite.update({
      where: { id: existingInvite.id },
      data: { status: 'PENDING', inviterId, resolvedAt: null }
    });
  }

  const invite = await prisma.chatInvite.create({
    data: {
      chatRoomId,
      inviterId,
      inviteeId
    }
  });

  return invite;
}

// Taklifni qabul qilish
async function acceptInvite(inviteId, userId) {
  const invite = await prisma.chatInvite.findUnique({
    where: { id: inviteId },
    include: { chatRoom: true }
  });

  if (!invite) throw new AppError('Taklif topilmadi', 404);
  if (invite.inviteeId !== userId) throw new AppError('Bu taklif sizga tegishli emas', 403);
  if (invite.status !== 'PENDING') throw new AppError('Taklif allaqachon ko\'rib chiqilgan', 400);

  // Statusni yangilash va Participant qilib qo'shish
  await prisma.$transaction([
    prisma.chatInvite.update({
      where: { id: inviteId },
      data: { status: 'ACCEPTED', resolvedAt: new Date() }
    }),
    prisma.chatParticipant.create({
      data: {
        chatRoomId: invite.chatRoomId,
        userId: userId,
        role: 'MEMBER'
      }
    })
  ]);

  return { chatRoomId: invite.chatRoomId };
}

// Taklifni rad etish
async function rejectInvite(inviteId, userId) {
  const invite = await prisma.chatInvite.findUnique({
    where: { id: inviteId }
  });

  if (!invite) throw new AppError('Taklif topilmadi', 404);
  if (invite.inviteeId !== userId) throw new AppError('Bu taklif sizga tegishli emas', 403);
  if (invite.status !== 'PENDING') throw new AppError('Taklif allaqachon ko\'rib chiqilgan', 400);

  await prisma.chatInvite.update({
    where: { id: inviteId },
    data: { status: 'REJECTED', resolvedAt: new Date() }
  });

  return true;
}

// Kelgan barcha takliflarni ko'rish
async function getMyInvites(userId) {
  const invites = await prisma.chatInvite.findMany({
    where: { inviteeId: userId, status: 'PENDING' },
    include: {
      chatRoom: { select: { id: true, name: true, avatarUrl: true, type: true } },
      inviter: { select: { id: true, fullname: true, avatarUrl: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return invites;
}

// Guruh ma'lumotlari, ishtirokchilar va medialarni olish (Info Screen uchun)
async function getChatRoomInfo(chatRoomId, userId) {
  // Ruxsatni tekshirish
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId } }
  });

  if (!participant) throw new AppError('Siz ushbu guruh a\'zosi emassiz', 403);

  // Ishtirokchilar
  const participants = await prisma.chatParticipant.findMany({
    where: { chatRoomId },
    include: {
      user: {
        select: { id: true, fullname: true, avatarUrl: true }
      }
    },
    orderBy: { joinedAt: 'asc' }
  });

  // Guruh haqida ma'lumot
  const room = await prisma.chatRoom.findUnique({
    where: { id: chatRoomId },
    select: { id: true, name: true, avatarUrl: true, type: true, createdAt: true }
  });

  // Media fayllarni olish (Rasmlar, Videolar, Hujjatlar)
  const mediaFiles = await prisma.chatMessage.findMany({
    where: {
      chatRoomId,
      fileId: { not: null },
      isDeleted: false
    },
    select: {
      id: true,
      fileId: true,
      fileType: true,
      fileName: true,
      isSecureFile: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50 // Limit 50 for now
  });

  return {
    room,
    participants,
    media: mediaFiles
  };
}

module.exports = {
  getOrCreateDirectChat,
  getOrCreateTaskRoom,
  createCustomGroup,
  updateGroupSettings,
  removeParticipant,
  leaveGroup,
  searchUsersForInvite,
  sendInvite,
  acceptInvite,
  rejectInvite,
  getMyInvites,
  getChatRoomInfo
};
