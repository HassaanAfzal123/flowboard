const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const taskController = require('../controllers/task.controller');

const router = express.Router();

router.use(authMiddleware);

// Under a project
router.get('/projects/:id/tasks', taskController.listTasks);
router.post('/projects/:id/tasks', taskController.createTask);

// Single task
router.get('/tasks/:id', taskController.getTask);
router.patch('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);

module.exports = router;

