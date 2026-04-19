const projectService = require('../services/project.service');

async function listProjects(req, res, next) {
  try {
    const { id: organizationId } = req.params;
    const { page, limit } = req.query;

    const result = await projectService.listProjectsForOrganization(organizationId, req.user.id, {
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function createProject(req, res, next) {
  try {
    const { id: organizationId } = req.params;
    const { name, description, startDate, endDate } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const project = await projectService.createProject(organizationId, req.user.id, {
      name,
      description,
      startDate,
      endDate,
    });

    return res.status(201).json({ project });
  } catch (err) {
    return next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectForUser(id, req.user.id);
    return res.status(200).json({ project });
  } catch (err) {
    return next(err);
  }
}

async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    const project = await projectService.updateProject(id, req.user.id, req.body);
    return res.status(200).json({ project });
  } catch (err) {
    return next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    await projectService.deleteProject(id, req.user.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
};

