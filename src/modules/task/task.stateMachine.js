const { AppError } = require('../../middleware/errorHandler');

/**
 * Task Status Enum mapping to Prisma schema
 */
const TASK_STATUS = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  PREVIEW_PENDING: 'PREVIEW_PENDING',
  IN_REVIEW: 'IN_REVIEW',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
  DISPUTED: 'DISPUTED'
};

/**
 * Strict state machine defining valid transitions between task statuses.
 * The key is the CURRENT state, the array contains valid NEXT states.
 */
const VALID_TRANSITIONS = {
  [TASK_STATUS.OPEN]: [TASK_STATUS.ASSIGNED, TASK_STATUS.CANCELED],
  [TASK_STATUS.ASSIGNED]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.CANCELED], // Canceled if escrow fails
  [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.PREVIEW_PENDING, TASK_STATUS.DISPUTED],
  [TASK_STATUS.PREVIEW_PENDING]: [TASK_STATUS.IN_REVIEW, TASK_STATUS.IN_PROGRESS], // Client approves preview -> IN_REVIEW. Revisions -> IN_PROGRESS
  [TASK_STATUS.IN_REVIEW]: [TASK_STATUS.COMPLETED, TASK_STATUS.IN_PROGRESS, TASK_STATUS.DISPUTED], // IN_PROGRESS = revision requested
  [TASK_STATUS.COMPLETED]: [], // Terminal state
  [TASK_STATUS.CANCELED]: [], // Terminal state
  [TASK_STATUS.DISPUTED]: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELED] // Resolved by admin
};

/**
 * Validates if a state transition is allowed according to the state machine.
 * Throws AppError if invalid.
 * 
 * @param {string} currentState - The current status of the task
 * @param {string} nextState - The requested new status
 * @throws {AppError} If transition is invalid
 */
function validateTransition(currentState, nextState) {
  if (!VALID_TRANSITIONS[currentState]) {
    throw new AppError(`Noma'lum holat: ${currentState}`, 500, 'INVALID_STATE');
  }

  if (!VALID_TRANSITIONS[currentState].includes(nextState)) {
    throw new AppError(
      `Ruxsat etilmagan holat o'zgarishi: ${currentState} -> ${nextState}`,
      400,
      'INVALID_STATE_TRANSITION'
    );
  }
  
  return true;
}

module.exports = {
  TASK_STATUS,
  validateTransition
};
