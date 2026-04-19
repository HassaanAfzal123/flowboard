const taskService = require('../services/task.service');

async function listTasks(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const { page, limit } = req.query;

    const result = await taskService.listTasksForProject(projectId, req.user.id, {
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const { title, description, status, assigneeId, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const task = await taskService.createTask(projectId, req.user.id, {
      title,
      description,
      status,
      assigneeId,
      dueDate,
    });

    return res.status(201).json({ task });
  } catch (err) {
    return next(err);
  }
}

async function getTask(req, res, next) {
  try {
    const { id } = req.params;
    const task = await taskService.getTask(id, req.user.id);
    return res.status(200).json({ task });
  } catch (err) {
    return next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const task = await taskService.updateTask(id, req.user.id, req.body);
    return res.status(200).json({ task });
  } catch (err) {
    return next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    await taskService.deleteTask(id, req.user.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
};

