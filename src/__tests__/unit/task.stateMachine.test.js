const { validateTransition, TASK_STATUS } = require('../../modules/task/task.stateMachine');

describe('Task State Machine', () => {
  it('OPEN dan ASSIGNED ga o\'tish mumkin bo\'lishi kerak', () => {
    expect(() => validateTransition(TASK_STATUS.OPEN, TASK_STATUS.ASSIGNED)).not.toThrow();
  });

  it('OPEN dan COMPLETED ga o\'tish mumkin bo\'lmasligi kerak (Qatiy qoida)', () => {
    expect(() => validateTransition(TASK_STATUS.OPEN, TASK_STATUS.COMPLETED)).toThrow('Ruxsat etilmagan holat o\'zgarishi');
  });

  it('COMPLETED dan boshqa holatga o\'tish mumkin bo\'lmasligi kerak', () => {
    Object.values(TASK_STATUS).forEach(status => {
      if (status !== TASK_STATUS.COMPLETED) {
        expect(() => validateTransition(TASK_STATUS.COMPLETED, status)).toThrow();
      }
    });
  });

  it('IN_REVIEW dan COMPLETED yoki DISPUTED yoki IN_PROGRESS ga o\'tish mumkin bo\'lishi kerak', () => {
    expect(() => validateTransition(TASK_STATUS.IN_REVIEW, TASK_STATUS.COMPLETED)).not.toThrow();
    expect(() => validateTransition(TASK_STATUS.IN_REVIEW, TASK_STATUS.DISPUTED)).not.toThrow();
    expect(() => validateTransition(TASK_STATUS.IN_REVIEW, TASK_STATUS.IN_PROGRESS)).not.toThrow();
  });

  it('Noma\'lum holatdan o\'tishga harakat qilinganda 500 xatolik qaytarishi kerak', () => {
    expect(() => validateTransition('UNKNOWN_STATE', TASK_STATUS.OPEN)).toThrow('Noma\'lum holat');
  });
});
