const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Comment = require('../models/comment.model');
const Member = require('../models/member.model');
const organizationService = require('./organization.service');
const cache = require('../config/redis');

async function listProjectsForOrganization(organizationId, userId, { page = 1, limit = 20 } = {}) {
  // Any member of the organization can see its projects
  await organizationService.getOrganizationForUser(organizationId, userId);

  const skip = (Number(page) - 1) * Number(limit);
  const cacheKey = `projects:org:${organizationId}:page:${page}:limit:${limit}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [items, total] = await Promise.all([
    Project.find({ organizationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Project.countDocuments({ organizationId }),
  ]);

  const result = {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
  };

  await cache.set(cacheKey, result, 60);

  return result;
}

async function createProject(organizationId, userId, data) {
  // Any member can create a project (we could tighten later)
  await organizationService.getOrganizationForUser(organizationId, userId);

  const project = await Project.create({
    organizationId,
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    createdBy: userId,
  });

  // Invalidate cached project lists for this organization
  const baseKeyPrefix = `projects:org:${organizationId}:page:`;
  // Simple strategy: delete a few common pages; in a real system we'd use key scans or tagging
  await Promise.all(
    [1, 2, 3].map((p) => cache.del(`${baseKeyPrefix}${p}:limit:${data.limit || 20}`))
  );

  return project.toObject();
}

async function getProjectForUser(projectId, userId) {
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
    error.errorCode = 'ORG_MEMBERSHIP_REQUIRED';
    throw error;
  }

  const obj = project.toObject();
  obj.role = membership.role;
  return obj;
}

async function updateProject(projectId, userId, updates) {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  // Only owner/admin at org level can update projects
  await organizationService.requireRole(project.organizationId, userId, ['owner', 'admin']);

  if (updates.name !== undefined) project.name = updates.name;
  if (updates.description !== undefined) project.description = updates.description;
  if (updates.startDate !== undefined) project.startDate = updates.startDate;
  if (updates.endDate !== undefined) project.endDate = updates.endDate;

  await project.save();

  const membership = await Member.findOne({
    organizationId: project.organizationId,
    userId,
  });
  const obj = project.toObject();
  if (membership) obj.role = membership.role;
  return obj;
}

async function deleteProject(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  // Only owner/admin at org level can delete projects
  await organizationService.requireRole(project.organizationId, userId, ['owner', 'admin']);

  const tasks = await Task.find({ projectId }).select('_id').lean();
  const taskIds = tasks.map((t) => t._id);
  if (taskIds.length) {
    await Comment.deleteMany({ taskId: { $in: taskIds } });
  }
  await Task.deleteMany({ projectId });
  await Project.findByIdAndDelete(projectId);
}

module.exports = {
  listProjectsForOrganization,
  createProject,
  getProjectForUser,
  updateProject,
  deleteProject,
};

