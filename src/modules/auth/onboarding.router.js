const express = require('express');
const onboardingController = require('./onboarding.controller');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

router.get('/check-username', onboardingController.checkUsername);
router.get('/universities', onboardingController.getUniversities);

// Barcha pastdagi routelar uchun auth talab qilinadi
router.use(requireAuth);

router.post('/complete', onboardingController.completeOnboarding);
router.post('/verify-student', onboardingController.verifyStudent);
router.post('/become-freelancer', onboardingController.becomeFreelancer);

module.exports = router;
