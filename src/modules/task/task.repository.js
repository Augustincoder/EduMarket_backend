const prisma = require('../../config/prisma');

class TaskRepository {
  async create(args) {
    return prisma.task.create(args);
  }

  async findUnique(args) {
    return prisma.task.findUnique(args);
  }

  async findFirst(args) {
    return prisma.task.findFirst(args);
  }

  async findMany(args) {
    return prisma.task.findMany(args);
  }

  async update(args) {
    return prisma.task.update(args);
  }
  
  async updateMany(args) {
    return prisma.task.updateMany(args);
  }

  async count(args) {
    return prisma.task.count(args);
  }

  async delete(args) {
    return prisma.task.delete(args);
  }
}

module.exports = new TaskRepository();
