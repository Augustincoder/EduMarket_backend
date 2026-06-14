const prisma = require('./src/config/prisma');
async function check() {
  const rooms = await prisma.chatRoom.findMany({ include: { participants: true } });
  console.log(JSON.stringify(rooms, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
