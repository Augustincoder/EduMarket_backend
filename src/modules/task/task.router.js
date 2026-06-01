const router = require('express').Router();
const taskController = require('./task.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { nlpFilter } = require('../../middleware/nlpFilter');
const { cache } = require('../../middleware/cache');
const { createTaskSchema, listTasksSchema } = require('./task.schema');

// GET /api/v1/tasks - Publicly accessible
router.get(
  '/',
  cache(30), // 30 seconds cache for listings and search
  validate(listTasksSchema, 'query'),
  asyncHandler(taskController.listTasks)
);

// GET /api/v1/tasks/my - User's tasks
router.get(
  '/my',
  requireAuth,
  asyncHandler(taskController.getMyTasks)
);

// GET /api/v1/tasks/:id - Publicly accessible
router.get(
  '/:id',
  cache(60), // 60 seconds cache for individual task details
  asyncHandler(taskController.getTask)
);

// POST /api/v1/tasks - Requires auth
router.post(
  '/',
  requireAuth,
  validate(createTaskSchema, 'body'),
  nlpFilter, // Check for academic fraud
  asyncHandler(taskController.createTask)
);

// POST /api/v1/tasks/:id/start-progress - Freelancer starts task
router.post(
  '/:id/start-progress',
  requireAuth,
  asyncHandler(taskController.startProgress)
);

// POST /api/v1/tasks/:id/submit-review - Freelancer submits for review
router.post(
  '/:id/submit-review',
  requireAuth,
  asyncHandler(taskController.submitTask)
);

// POST /api/v1/tasks/:id/accept - Client accepts completed task
router.post(
  '/:id/accept',
  requireAuth,
  asyncHandler(taskController.acceptTask)
);

// POST /api/v1/tasks/:id/request-revision - Client requests revision
router.post(
  '/:id/request-revision',
  requireAuth,
  asyncHandler(taskController.requestRevision)
);

// POST /api/v1/tasks/:id/cancel - Cancel task
router.post(
  '/:id/cancel',
  requireAuth,
  asyncHandler(taskController.cancelTask)
);

// POST /api/v1/tasks/:id/dispute - Open dispute
router.post(
  '/:id/dispute',
  requireAuth,
  asyncHandler(taskController.openDispute)
);

// DELETE /api/v1/tasks/:id - Soft delete (Client)
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(taskController.deleteTask)
);

module.exports = router;
