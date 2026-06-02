const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('./src/utils/jwt');

const prisma = new PrismaClient();

async function testApi() {
  const user = await prisma.user.findFirst();
  const task = await prisma.task.findFirst({ where: { clientId: user.id } });
  
  if (!user || !task) {
    console.log('No user or task found');
    return;
  }

  const token = generateToken({ userId: user.id, role: user.role });
  console.log(`Testing with user: ${user.fullname}, taskId: ${task.id}`);

  try {
    const historyRes = await fetch(`http://localhost:3000/api/v1/chat/${task.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('History Status:', historyRes.status);
    console.log('History Data:', await historyRes.json());

    const sendRes = await fetch(`http://localhost:3000/api/v1/chat/${task.id}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: "Test message from API test" })
    });
    console.log('Send Status:', sendRes.status);
    console.log('Send Data:', await sendRes.json());
    
  } catch (err) {
    console.error('Request Error:', err.message);
  }
}

testApi().finally(() => prisma.$disconnect());
