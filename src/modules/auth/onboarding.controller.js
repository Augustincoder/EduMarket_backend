const onboardingService = require('./onboarding.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const completeOnboarding = asyncHandler(async (req, res) => {
  const user = await onboardingService.completeOnboarding(req.user.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

const verifyStudent = asyncHandler(async (req, res) => {
  const { fileId } = req.body;
  const user = await onboardingService.verifyStudent(req.user.id, fileId);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

const becomeFreelancer = asyncHandler(async (req, res) => {
  const user = await onboardingService.becomeFreelancer(req.user.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.query;
  const result = await onboardingService.checkUsername(username);
  res.status(200).json({
    status: 'success',
    data: result
  });
});

const getUniversities = asyncHandler(async (req, res) => {
  const { getUniversities: loadUnvs } = require('../../utils/university');
  res.status(200).json({
    status: 'success',
    data: loadUnvs()
  });
});

module.exports = {
  completeOnboarding,
  verifyStudent,
  becomeFreelancer,
  checkUsername,
  getUniversities
};
