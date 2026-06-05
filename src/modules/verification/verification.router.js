const express = require('express');
const router = express.Router();
const verificationController = require('./verification.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// User routes
router.use(protect);
router.post('/submit', verificationController.submit);
router.get('/my-status', verificationController.getMyStatus);

// Admin routes
router.use(restrictTo('ADMIN'));
router.get('/admin/list', verificationController.adminList);
router.post('/admin/resolve/:id', verificationController.adminResolve);

module.exports = router;
