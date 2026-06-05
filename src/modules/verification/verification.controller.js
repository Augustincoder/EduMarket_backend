const verificationService = require('./verification.service');
const { catchAsync } = require('../../middleware/errorHandler');

/**
 * Submit verification
 */
const submit = catchAsync(async (req, res) => {
  const result = await verificationService.submitRequest(req.user.id, req.body);
  res.json({ success: true, data: result });
});

/**
 * Get my status
 */
const getMyStatus = catchAsync(async (req, res) => {
  const result = await verificationService.getMyRequest(req.user.id);
  res.json({ success: true, data: result });
});

/**
 * Admin: List requests
 */
const adminList = catchAsync(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await verificationService.getAllRequests({ status }, Number(page) || 1, Number(limit) || 20);
  res.json({ success: true, data: result });
});

/**
 * Admin: Resolve
 */
const adminResolve = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await verificationService.resolveRequest(id, req.user.id, req.body);
  res.json({ success: true, data: result });
});

module.exports = {
  submit,
  getMyStatus,
  adminList,
  adminResolve
};
