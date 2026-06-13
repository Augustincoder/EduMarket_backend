const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

/**
 * Recalculate Reputation DNA metrics for a user
 * @param {string} userId - ID of the freelancer
 */
async function recalculateReputationDNA(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        freelancerTasks: {
          include: {
            delivery: true,
            chat: {
              where: { senderId: userId },
              orderBy: { createdAt: 'asc' },
            }
          }
        }
      }
    });

    if (!user) throw new Error('Foydalanuvchi topilmadi');

    const tasks = user.freelancerTasks;
    if (tasks.length === 0) {
      // Create empty reputation DNA if no tasks
      return await prisma.reputationDNA.upsert({
        where: { userId },
        update: {},
        create: { userId }
      });
    }

    let completedTasks = 0;
    let onTimeTasks = 0;
    let noRevisionTasks = 0;
    let totalAccepted = 0;
    
    // Client repetition tracking
    const clientCounts = {};

    tasks.forEach(task => {
      // 1. Completion Rate: count tasks that are completed vs assigned
      if (['ASSIGNED', 'IN_PROGRESS', 'PREVIEW_PENDING', 'IN_REVIEW', 'COMPLETED', 'DISPUTED'].includes(task.status)) {
        totalAccepted++;
      }

      if (task.status === 'COMPLETED') {
        completedTasks++;

        // Client repeat rate tracking
        clientCounts[task.clientId] = (clientCounts[task.clientId] || 0) + 1;

        // Deadline Accuracy
        if (task.completedAt && task.deadline && task.completedAt <= task.deadline) {
          onTimeTasks++;
        }

        // Revision Rate (0 revisions)
        if (task.delivery && task.delivery.revisionCount === 0) {
          noRevisionTasks++;
        }
      }
    });

    // Calculations
    const completionRate = totalAccepted > 0 ? (completedTasks / totalAccepted) * 100 : 0;
    const deadlineAccuracy = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;
    const revisionRate = completedTasks > 0 ? (noRevisionTasks / completedTasks) * 100 : 0;

    // Repeat Clients
    const totalClients = Object.keys(clientCounts).length;
    let repeatClientsCount = 0;
    for (const clientId in clientCounts) {
      if (clientCounts[clientId] > 1) repeatClientsCount++;
    }
    const repeatClients = totalClients > 0 ? (repeatClientsCount / totalClients) * 100 : 0;

    // Response Speed (Mock logic for MVP - normally you'd calculate diff between client's first msg and freelancer's reply)
    // Here we will just set a default high score if they have completed tasks, or randomize slightly based on completion rate
    // In a real app, you'd calculate actual timestamps.
    const responseSpeed = completionRate > 0 ? Math.min(100, completionRate + 5) : 0;

    // Total Score (0-5)
    // Weights: CR 30%, DA 20%, RS 20%, RR 15%, RC 15%
    const totalScore100 = (completionRate * 0.30) + 
                          (deadlineAccuracy * 0.20) + 
                          (responseSpeed * 0.20) + 
                          (revisionRate * 0.15) + 
                          (repeatClients * 0.15);
    
    const totalScore = (totalScore100 / 100) * 5;

    // Upsert into DB
    const dna = await prisma.reputationDNA.upsert({
      where: { userId },
      update: {
        completionRate,
        deadlineAccuracy,
        responseSpeed,
        revisionRate,
        repeatClients,
        totalScore
      },
      create: {
        userId,
        completionRate,
        deadlineAccuracy,
        responseSpeed,
        revisionRate,
        repeatClients,
        totalScore
      }
    });

    return dna;
  } catch (error) {
    logger.error(`Reputation DNA hisoblashda xatolik: ${error.message}`);
    throw error;
  }
}

/**
 * Get user's Reputation DNA. Recalculates if it doesn't exist.
 */
async function getReputationDNA(userId) {
  let dna = await prisma.reputationDNA.findUnique({
    where: { userId }
  });

  if (!dna) {
    dna = await recalculateReputationDNA(userId);
  }

  return dna;
}

module.exports = {
  recalculateReputationDNA,
  getReputationDNA
};
