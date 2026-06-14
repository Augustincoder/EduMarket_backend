const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const { getIO, isUserOnline, getOnlineUsersSet } = require('../../config/socket');
const logger = require('../../utils/logger');
const notificationService = require('../notification/notification.service');
const { v4: uuidv4 } = require('uuid');
const { chatQueue } = require('../../config/queue');

/**
 * 3-BOSQICH: XABARLASHISH VA TIZIM VOQEALARI (MESSAGING & EVENTS)
 */

async function checkChatAccess(chatRoomId, userId) {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId } },
    include: { chatRoom: true }
  });

  if (!participant) {
    throw new AppError('Ushbu chatga kirish huquqingiz yo\'q', 403);
  }

  return participant.chatRoom;
}

// Xabar yuborish (Matn yoki Fayl)
async function sendMessage(chatRoomId, senderId, data) {
  const room = await checkChatAccess(chatRoomId, senderId);

  // Optimistic ID generation
  const messageId = uuidv4();
  const createdAt = new Date();

  // Fetch sender info for socket
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { id: true, fullname: true, username: true, avatarUrl: true }
  });

  // Fetch replyTo if exists
  let replyTo = null;
  if (data.replyToId) {
    replyTo = await prisma.chatMessage.findUnique({
      where: { id: data.replyToId },
      select: { id: true, content: true, fileType: true, sender: { select: { fullname: true } } }
    });
  }

  // Construct message object
  const message = {
    id: messageId,
    chatRoomId,
    senderId,
    type: data.type || 'TEXT',
    content: data.content,
    fileId: data.fileId,
    fileType: data.fileType,
    fileName: data.fileName,
    isSecureFile: data.isSecureFile || false,
    replyToId: data.replyToId,
    clientId: data.clientId || null,
    metadata: data.metadata || null,
    createdAt: createdAt.toISOString(), // ISO for socket
    sender,
    replyTo
  };

  // 1. Emit to Socket immediately
  try {
    const io = getIO();
    io.to(`chat_${chatRoomId}`).emit('new_message', message);
  } catch (err) {
    logger.error(`Socket emit failed: ${err.message}`);
  }

  // 2. Add to BullMQ for DB save and Offline Notifications
  try {
    const participants = await prisma.chatParticipant.findMany({
      where: { chatRoomId }
    });
    
    await chatQueue.add('save_message', {
      message,
      participants,
      taskId: room.taskId,
      chatRoomId,
      senderId
    });
  } catch (err) {
    logger.error(`Failed to add message to Queue: ${err.message}`);
  }

  return message;
}

// Tizim xabari (System Event) yuborish (Bot kabi)
async function sendSystemEvent(chatRoomId, content, metadata = null) {
  const messageId = uuidv4();
  const createdAt = new Date();

  const message = {
    id: messageId,
    chatRoomId,
    senderId: null, // Tizim xabari
    type: 'SYSTEM_EVENT',
    content,
    metadata,
    createdAt: createdAt.toISOString()
  };

  try {
    const io = getIO();
    io.to(`chat_${chatRoomId}`).emit('new_message', message);
  } catch (err) {}

  try {
    await chatQueue.add('save_message', {
      message,
      participants: null, // Skip offline notifications for system events
      chatRoomId,
      senderId: null
    });
  } catch (err) {
    logger.error(`Failed to add system event to Queue: ${err.message}`);
  }

  return message;
}

// Xabarlarni qadab qo'yish (Pin) yoki Olib tashlash (Unpin)
async function pinMessage(chatRoomId, requesterId, messageId) {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId: requesterId } }
  });

  if (!participant || (participant.role !== 'OWNER' && participant.role !== 'ADMIN')) {
    throw new AppError('Xabarni qadash huquqingiz yo\'q', 403);
  }

  let finalMessageId = messageId;
  let eventText = `Xabar qadab qo'yildi.`;

  if (messageId === 'unpin' || !messageId) {
    finalMessageId = null;
    eventText = `Qadalgan xabar olib tashlandi.`;
  } else {
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message || message.chatRoomId !== chatRoomId) {
      throw new AppError('Xabar ushbu chatga tegishli emas', 404);
    }
  }

  const room = await prisma.chatRoom.update({
    where: { id: chatRoomId },
    data: { pinnedMsgId: finalMessageId },
    include: { pinnedMsg: true }
  });

  try {
    const io = getIO();
    io.to(`chat_${chatRoomId}`).emit('message_pinned', { chatRoomId, message: room.pinnedMsg });
  } catch (err) {}

  // Tizim xabari ham tashlab qoyamiz
  await sendSystemEvent(chatRoomId, eventText);

  return room;
}

// Cursor-based Pagination yordamida xabarlarni yuklash
async function getMessages(chatRoomId, userId, cursor, limit = 50) {
  await checkChatAccess(chatRoomId, userId);

  const where = { chatRoomId };
  if (cursor) {
    where.id = { lt: cursor }; // older messages
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    take: limit,
    orderBy: { id: 'desc' },
    include: {
      sender: { select: { id: true, fullname: true, username: true, avatarUrl: true } },
      replyTo: {
        select: { id: true, content: true, fileType: true, sender: { select: { fullname: true } } }
      }
    }
  });

  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

  // Shu joyda lastReadAt ni yangilaymiz
  await prisma.chatParticipant.update({
    where: { chatRoomId_userId: { chatRoomId, userId } },
    data: { lastReadAt: new Date() }
  });

  return { messages, nextCursor };
}

// Barcha chatlar ro'yxati (Sidebar uchun)
async function getConversations(userId) {
  // 1. Fetch all participants and rooms
  const participants = await prisma.chatParticipant.findMany({
    where: { userId },
    include: {
      chatRoom: {
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          participants: {
            include: { user: { select: { id: true, fullname: true, username: true, avatarUrl: true } } }
          }
        }
      }
    },
    orderBy: { chatRoom: { updatedAt: 'desc' } }
  });

  if (participants.length === 0) return [];

  // 2. Fetch all unread counts in ONE single raw query (Fixing N+1 issue)
  const unreadCountsRaw = await prisma.$queryRaw`
    SELECT m."chat_room_id" as "chatRoomId", COUNT(m.id)::int as "unreadCount"
    FROM "chat_messages" m
    INNER JOIN "chat_participants" p ON m."chat_room_id" = p."chat_room_id"
    WHERE p."user_id" = ${userId}
      AND m."sender_id" IS DISTINCT FROM ${userId}
      AND (p."last_read_at" IS NULL OR m."created_at" > p."last_read_at")
    GROUP BY m."chat_room_id"
  `;

  // Map counts to an object for O(1) lookup
  const unreadCountsMap = {};
  for (const row of unreadCountsRaw) {
    unreadCountsMap[row.chatRoomId] = row.unreadCount;
  }

  // 3. Get online users
  const onlineUsers = await getOnlineUsersSet();

  // 4. Assemble the result
  const result = participants.map((p) => {
    const room = p.chatRoom;
    let title = room.name;
    let avatar = room.avatarUrl;
    let otherUser = null;
    const otherParticipant = room.participants.find(part => part.userId !== userId);

    if (room.type === 'DIRECT') {
      if (otherParticipant) {
        otherUser = otherParticipant.user;
        title = otherUser.fullname;
        avatar = otherUser.avatarUrl;
        otherUser.isOnline = onlineUsers.has(otherUser.id);
      }
    } else if (room.type === 'TASK_ROOM') {
      title = room.name;
      if (otherParticipant) {
        avatar = otherParticipant.user.avatarUrl;
        otherUser = otherParticipant.user;
      }
    }

    return {
      chatRoomId: room.id,
      type: room.type,
      taskId: room.taskId,
      title,
      avatarUrl: avatar,
      otherUser,
      lastMessage: room.messages[0] || null,
      unreadCount: unreadCountsMap[room.id] || 0
    };
  });

  return result;
}

// Xabarni tahrirlash
async function editMessage(messageId, userId, newContent) {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('Xabar topilmadi', 404);
  if (message.senderId !== userId) throw new AppError('Faqat o\'zingizning xabaringizni tahrirlashingiz mumkin', 403);
  if (message.isDeleted) throw new AppError('O\'chirilgan xabarni tahrirlab bo\'lmaydi', 400);

  const updatedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content: newContent, isEdited: true, editedAt: new Date() },
    include: {
      sender: { select: { id: true, fullname: true, username: true, avatarUrl: true } },
      replyTo: { select: { id: true, content: true, fileType: true, sender: { select: { fullname: true } } } }
    }
  });

  try {
    const io = getIO();
    io.to(`chat_${message.chatRoomId}`).emit('message_edited', updatedMessage);
  } catch (err) {}

  return updatedMessage;
}

// Xabarni o'chirish
async function deleteMessage(messageId, userId) {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('Xabar topilmadi', 404);
  
  // Owner yoki xabar egasi
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatRoomId_userId: { chatRoomId: message.chatRoomId, userId } }
  });

  const isSender = message.senderId === userId;
  const isAdmin = participant?.role === 'OWNER' || participant?.role === 'ADMIN';

  if (!isSender && !isAdmin) {
    throw new AppError('Xabarni o\'chirish huquqingiz yo\'q', 403);
  }

  const deletedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, deletedAt: new Date(), content: null }
  });

  try {
    const io = getIO();
    io.to(`chat_${message.chatRoomId}`).emit('message_deleted', { messageId, chatRoomId: message.chatRoomId });
  } catch (err) {}

  return deletedMessage;
}

// Reaksiyalar (Like, Heart)
async function toggleReaction(messageId, userId, icon) {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('Xabar topilmadi', 404);
  
  await checkChatAccess(message.chatRoomId, userId);

  let reactions = [];
  try {
    reactions = typeof message.reactions === 'string' ? JSON.parse(message.reactions) : message.reactions || [];
    if (!Array.isArray(reactions)) reactions = [];
  } catch(e) {
    reactions = [];
  }

  const existingReactionIndex = reactions.findIndex(r => r.userId === userId);

  if (existingReactionIndex !== -1) {
    if (reactions[existingReactionIndex].icon === icon) {
      reactions.splice(existingReactionIndex, 1);
    } else {
      reactions[existingReactionIndex].icon = icon;
    }
  } else {
    reactions.push({ icon, userId });
  }

  const updatedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { reactions }
  });

  try {
    const io = getIO();
    io.to(`chat_${message.chatRoomId}`).emit('message_reaction_updated', { 
      messageId, 
      chatRoomId: message.chatRoomId, 
      reactions 
    });
  } catch (err) {}

  return updatedMessage;
}

// Xabarlarni o'qilgan deb belgilash
async function markAsRead(chatRoomId, userId) {
  await checkChatAccess(chatRoomId, userId);
  
  await prisma.chatParticipant.update({
    where: { chatRoomId_userId: { chatRoomId, userId } },
    data: { lastReadAt: new Date() }
  });
  
  // Optionally, we could update message.isRead if we were doing per-message read receipts,
  // but cursor-based room read tracking is usually enough (Slack style).

  return { success: true };
}

// Global Full-Text Search (Master Level)
async function searchGlobalMessages(userId, query) {
  if (!query || query.trim().length < 2) return [];

  // Find all rooms the user is part of
  const participants = await prisma.chatParticipant.findMany({
    where: { userId },
    select: { chatRoomId: true }
  });
  
  if (participants.length === 0) return [];
  
  const roomIds = participants.map(p => p.chatRoomId);

  // Sanitize query to keep only letters, numbers and spaces
  const cleanQuery = query.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (cleanQuery.length < 2) return [];

  // PostgreSQL FTS query format: "word1:* | word2:*"
  const formattedQuery = cleanQuery.split(/\s+/).map(word => `${word}:*`).join(' | ');

  const messages = await prisma.chatMessage.findMany({
    where: {
      chatRoomId: { in: roomIds },
      content: {
        search: formattedQuery
      },
      isDeleted: false
    },
    take: 50,
    orderBy: { _relevance: { fields: ['content'], search: formattedQuery, sort: 'desc' } },
    include: {
      sender: { select: { id: true, fullname: true, avatarUrl: true } },
      chatRoom: { 
        select: { 
          id: true, type: true, name: true, avatarUrl: true, 
          participants: { include: { user: { select: { id: true, fullname: true, avatarUrl: true } } } } 
        } 
      }
    }
  });

  return messages;
}

module.exports = {
  sendMessage,
  sendSystemEvent,
  pinMessage,
  getMessages,
  getConversations,
  editMessage,
  deleteMessage,
  toggleReaction,
  markAsRead,
  searchGlobalMessages
};
