const express = require('express');
const reportController = require('./report.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/adminOnly');

const router = express.Router();

router.use(requireAuth);

router.post('/', reportController.createReport);

// Faqat admin uchun
router.use(requireAdmin);
router.get('/', reportController.getReports);
router.patch('/:id/resolve', reportController.resolveReport);

module.exports = router;
