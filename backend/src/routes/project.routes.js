const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const projectController = require('../controllers/project.controller');

const router = express.Router();

router.use(authMiddleware);

// Under an organization
router.get('/organizations/:id/projects', projectController.listProjects);
router.post('/organizations/:id/projects', projectController.createProject);

// Single project
router.get('/projects/:id', projectController.getProject);
router.patch('/projects/:id', projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);

module.exports = router;

