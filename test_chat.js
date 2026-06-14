const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const chatRoomService = require('./src/modules/chat/chat-room.service');
const chatService = require('./src/modules/chat/chat.service');

async function test() {
  const users = await prisma.user.findMany({ take: 2 });
  if (users.length < 2) return console.log('Not enough users');
  
  const u1 = users[0].id;
  const u2 = users[1].id;
  
  console.log(`Creating direct chat between ${u1} and ${u2}...`);
  const room = await chatRoomService.getOrCreateDirectChat(u1, u2);
  console.log('Room created:', room.id);
  
  console.log('Fetching conversations for', u1);
  const convs = await chatService.getConversations(u1);
  console.log(JSON.stringify(convs, null, 2));
}

test().catch(console.error).finally(() => prisma.$disconnect());
