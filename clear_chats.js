const prisma = require('./src/config/prisma');

async function main() {
  await prisma.$executeRawUnsafe('DELETE FROM chat_messages;');
  console.log('Deleted chat_messages');
}

main().catch(console.error).finally(() => prisma.$disconnect());
