const categoryService = require('./category.service');
const { catchAsync } = require('../../utils/catchAsync');
const { AppError } = require('../../middleware/errorHandler');

exports.getPublicCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getCategories();
  res.status(200).json({
    status: 'success',
    data: { categories }
  });
});

exports.getAdminCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getAllCategoriesAdmin();
  res.status(200).json({
    status: 'success',
    data: { categories }
  });
});

exports.createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({
    status: 'success',
    data: { category }
  });
});

exports.updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

exports.deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.toggleCategory = catchAsync(async (req, res) => {
  const category = await categoryService.toggleCategoryStatus(req.params.id, req.body.isActive);
  res.status(200).json({
    status: 'success',
    data: { category }
  });
});
