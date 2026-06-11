const express = require('express');
const categoryController = require('./category.controller');
const categorySchema = require('./category.schema');
const authController = require('../auth/auth.controller');
const { validate } = require('../../middleware/validate');

const router = express.Router();

// Public route for frontend
router.get('/', categoryController.getPublicCategories);

// Protected routes for ADMIN
router.use(authController.protect);
router.use(authController.restrictTo('ADMIN'));

router.route('/admin')
  .get(categoryController.getAdminCategories)
  .post(validate(categorySchema.createCategorySchema), categoryController.createCategory);

router.route('/admin/:id')
  .patch(validate(categorySchema.updateCategorySchema), categoryController.updateCategory)
  .delete(categoryController.deleteCategory);

router.patch('/admin/:id/toggle', categoryController.toggleCategory);

module.exports = router;
