const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Shikoyat yaratish
 * @param {string} reporterId Shikoyat qiluvchi ID
 * @param {object} data Shikoyat ma'lumotlari
 */
async function createReport(reporterId, data) {
  let { reportedId, taskId, chatMsgId, reportType, reason, evidenceFileId } = data;

  // Map frontend generic target fields if present
  if (data.targetId && data.targetType) {
    if (data.targetType === 'USER') {
      reportedId = data.targetId;
    } else if (data.targetType === 'TASK') {
      taskId = data.targetId;
    } else if (data.targetType === 'MESSAGE') {
      chatMsgId = data.targetId;
    }
  }

  // Resolve reportedId from task or message if not provided directly
  if (taskId && !reportedId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { clientId: true, freelancerId: true }
    });
    if (task) {
      reportedId = reporterId === task.clientId ? task.freelancerId : task.clientId;
    }
  }

  if (chatMsgId && !reportedId) {
    const msg = await prisma.message.findUnique({
      where: { id: chatMsgId },
      select: { senderId: true }
    });
    if (msg) {
      reportedId = msg.senderId;
    }
  }

  // Map frontend report type to backend schema report type enum
  const rawType = reportType || data.type;
  if (rawType) {
    if (rawType === 'SCAM') {
      reportType = 'FRAUD';
    } else if (rawType === 'INAPPROPRIATE_CONTENT') {
      reportType = 'INAPPROPRIATE';
    } else if (rawType === 'HARASSMENT') {
      reportType = 'COMMUNICATION';
    } else {
      reportType = rawType;
    }
  }

  if (!reportType || !reason) {
    throw new AppError('Shikoyat turi va sababi majburiy', 400);
  }

  // 1. Oxirgi 24 soat ichida xuddi shu muammo bo'yicha takroriy shikoyatni tekshirish
  const recentReport = await prisma.report.findFirst({
    where: {
      reporterId,
      reportedId,
      taskId,
      reportType,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (recentReport) {
    throw new AppError('Siz ushbu muammo bo\'yicha yaqinda shikoyat qolgansiz', 429);
  }

  const report = await prisma.report.create({
    data: {
      reporterId,
      reportedId: reportedId || null,
      taskId: taskId || null,
      chatMsgId: chatMsgId || null,
      reportType,
      reason,
      evidenceFileId: evidenceFileId || null,
    }
  });

  // FraudLog ga yozish
  if (reportedId) {
    await prisma.fraudLog.create({
      data: {
        suspectId: reportedId,
        targetId: taskId || null,
        type: 'USER_REPORTED',
        details: { reason, reportType, reporterId }
      }
    });
  }

  return report;
}

/**
 * Barcha shikoyatlarni olish (Admin)
 */
async function getReports(filters = {}) {
  const { status, type } = filters;
  const where = {};
  if (status) where.status = status;
  if (type) where.reportType = type;

  return await prisma.report.findMany({
    where,
    include: {
      reporter: { select: { id: true, fullname: true, username: true } },
      reported: { select: { id: true, fullname: true, username: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Shikoyatni hal qilish (Admin)
 */
async function resolveReport(reportId, adminId, { status, adminNotes }) {
  if (!['RESOLVED', 'DISMISSED'].includes(status)) {
    throw new AppError('Noto\'g\'ri status', 400);
  }

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      adminNotes,
      resolvedById: adminId,
      resolvedAt: new Date(),
    }
  });

  return report;
}

module.exports = {
  createReport,
  getReports,
  resolveReport
};
