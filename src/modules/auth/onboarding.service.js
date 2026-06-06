const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

async function completeOnboarding(userId, data) {
  const { fullname, username, bio, skills, region, universityId, university, faculty, studyYear } = data;

  // Check username uniqueness if provided
  if (username) {
    const existing = await prisma.user.findUnique({
      where: { username }
    });
    if (existing && existing.id !== userId) {
      throw new AppError('Ushbu username band', 400, 'USERNAME_TAKEN');
    }
  }

  let resolvedUniversityId = null;
  let resolvedUniversityName = null;

  if (universityId) {
    const { getUniversityById } = require('../../utils/university');
    const unv = getUniversityById(universityId);
    if (unv) {
      resolvedUniversityId = unv.id;
      resolvedUniversityName = unv.name;
    }
  } else if (university) {
    resolvedUniversityName = university;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      fullname: fullname || undefined,
      username: username || null,
      bio,
      skills: skills || [],
      region,
      universityId: resolvedUniversityId,
      university: resolvedUniversityName,
      faculty,
      studyYear: studyYear ? parseInt(studyYear, 10) : null,
      isOnboardingComplete: true
    }
  });

  return user;
}

async function verifyStudent(userId, fileId) {
  if (!fileId) throw new AppError('Guvohnoma fayli kiritilmagan', 400);
  
  // 1. Update user
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      studentCardFileId: fileId,
      verificationStatus: 'PENDING'
    }
  });

  // 2. Create VerificationRequest record
  await prisma.verificationRequest.create({
    data: {
      userId,
      documentType: 'STUDENT_ID',
      documentFileId: fileId,
      selfieFileId: fileId, // In onboarding we might only have one file
      status: 'PENDING'
    }
  });

  const notificationService = require('../notification/notification.service');
  notificationService.notifyAdminsVerifyStudent(user, fileId).catch((err) => {
    console.error('Failed to notify admins of student verification:', err);
  });

  return user;
}

async function becomeFreelancer(userId, data) {
  const { freelancerBio, freelancerCategories, freelancerExperience } = data;

  if (!freelancerCategories || freelancerCategories.length === 0) {
    throw new AppError('Kamida 1 ta kategoriya tanlash majburiy', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isFreelancer: true,
      freelancerBio,
      freelancerCategories: freelancerCategories,
      freelancerExperience: freelancerExperience ? parseInt(freelancerExperience, 10) : null
    }
  });

  return user;
}

async function checkUsername(username) {
  if (!username) return { available: false };
  const existing = await prisma.user.findUnique({
    where: { username }
  });
  return { available: !existing };
}

module.exports = {
  completeOnboarding,
  verifyStudent,
  becomeFreelancer,
  checkUsername
};
