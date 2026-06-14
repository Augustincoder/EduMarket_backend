const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({ select: { id: true, fullname: true, role: true }});
  console.log('Users:', users);
  
  const rooms = await prisma.chatRoom.findMany({ include: { participants: true }});
  console.log('Rooms:', JSON.stringify(rooms, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
