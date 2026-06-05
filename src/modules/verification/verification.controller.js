const verificationService = require('./verification.service');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * Submit verification
 */
const submit = asyncHandler(async (req, res) => {
  const result = await verificationService.submitRequest(req.user.userId, req.body);
  res.json({ success: true, data: result });
});

/**
 * Get my status
 */
const getMyStatus = asyncHandler(async (req, res) => {
  const result = await verificationService.getMyRequest(req.user.userId);
  res.json({ success: true, data: result });
});

/**
 * Admin: List requests
 */
const adminList = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await verificationService.getAllRequests({ status }, Number(page) || 1, Number(limit) || 20);
  res.json({ success: true, data: result });
});

/**
 * Admin: Resolve
 */
const adminResolve = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await verificationService.resolveRequest(id, req.user.userId, req.body);
  res.json({ success: true, data: result });
});

module.exports = {
  submit,
  getMyStatus,
  adminList,
  adminResolve
};
