const reportService = require('./report.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.user.userId || req.user.id, req.body);
  res.status(201).json({
    status: 'success',
    data: { report }
  });
});

const getReports = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    type: req.query.type,
  };
  const reports = await reportService.getReports(filters);
  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: { reports }
  });
});

const resolveReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await reportService.resolveReport(id, req.user.userId || req.user.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { report }
  });
});

module.exports = {
  createReport,
  getReports,
  resolveReport
};
