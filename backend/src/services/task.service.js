const Task = require('../models/task.model');
const Project = require('../models/project.model');
const Member = require('../models/member.model');
const Comment = require('../models/comment.model');

async function ensureProjectAccess(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  const membership = await Member.findOne({
    organizationId: project.organizationId,
    userId,
  });

  if (!membership) {
    const error = new Error('You are not a member of this organization');
    error.statusCode = 403;
    throw error;
  }

  return { project, role: membership.role };
}

async function ensureTaskAccess(taskId, userId) {
  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  const { project, role } = await ensureProjectAccess(task.projectId, userId);
  return { task, project, role };
}

async function listTasksForProject(projectId, userId, { page = 1, limit = 20 } = {}) {
  await ensureProjectAccess(projectId, userId);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Task.find({ projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Task.countDocuments({ projectId }),
  ]);

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

async function createTask(projectId, userId, data) {
  await ensureProjectAccess(projectId, userId);

  const task = await Task.create({
    projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    assigneeId: data.assigneeId,
    dueDate: data.dueDate,
    createdBy: userId,
  });

  return task.toObject();
}

async function getTask(taskId, userId) {
  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  await ensureProjectAccess(task.projectId, userId);

  return task.toObject();
}

async function updateTask(taskId, userId, updates) {
  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  const { role } = await ensureProjectAccess(task.projectId, userId);

  // Anyone with access can update tasks; we could tighten rules here using role
  if (updates.title !== undefined) task.title = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.status !== undefined) task.status = updates.status;
  if (updates.assigneeId !== undefined) task.assigneeId = updates.assigneeId;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;

  await task.save();

  const obj = task.toObject();
  obj.role = role;
  return obj;
}

async function deleteTask(taskId, userId) {
  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  const { role } = await ensureProjectAccess(task.projectId, userId);

  // Only org owner/admin or task creator can delete
  if (role !== 'owner' && role !== 'admin' && task.createdBy.toString() !== userId.toString()) {
    const error = new Error('You do not have permission to delete this task');
    error.statusCode = 403;
    throw error;
  }

  await Comment.deleteMany({ taskId });
  await Task.findByIdAndDelete(taskId);
}

module.exports = {
  ensureProjectAccess,
  ensureTaskAccess,
  listTasksForProject,
  createTask,
  getTask,
  updateTask,
  deleteTask,
};

