const router = require('express').Router({ mergeParams: true }); // mergeParams is important because it's mounted as /tasks/:id/milestones
const milestoneController = require('./milestone.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// GET /api/v1/tasks/:id/milestones
router.get('/', requireAuth, asyncHandler(milestoneController.getMilestones));

// POST /api/v1/tasks/:id/milestones
router.post('/', requireAuth, asyncHandler(milestoneController.createMilestone));

// PATCH /api/v1/tasks/:id/milestones/:milestoneId
router.patch('/:milestoneId', requireAuth, asyncHandler(milestoneController.toggleMilestone));

// DELETE /api/v1/tasks/:id/milestones/:milestoneId
router.delete('/:milestoneId', requireAuth, asyncHandler(milestoneController.deleteMilestone));

module.exports = router;
