const categoryService = require('./category.service');
const { AppError } = require('../../middleware/errorHandler');

exports.getPublicCategories = async (req, res) => {
  const categories = await categoryService.getCategories();
  res.status(200).json({
    status: 'success',
    data: { categories }
  });
};

exports.getAdminCategories = async (req, res) => {
  const categories = await categoryService.getAllCategoriesAdmin();
  res.status(200).json({
    status: 'success',
    data: { categories }
  });
};

exports.createCategory = async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({
    status: 'success',
    data: { category }
  });
};

exports.updateCategory = async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  if (!category) {
    throw new AppError('Kategoriya topilmadi', 404);
  }
  res.status(200).json({
    status: 'success',
    data: { category }
  });
};

exports.deleteCategory = async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.status(204).json({
    status: 'success',
    data: null
  });
};

exports.toggleCategory = async (req, res) => {
  const category = await categoryService.toggleCategoryStatus(req.params.id, req.body.isActive);
  res.status(200).json({
    status: 'success',
    data: { category }
  });
};
