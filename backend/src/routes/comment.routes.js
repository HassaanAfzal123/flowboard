const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const commentController = require('../controllers/comment.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/tasks/:id/comments', commentController.listComments);
router.post('/tasks/:id/comments', commentController.createComment);
router.patch('/comments/:id', commentController.updateComment);
router.delete('/comments/:id', commentController.deleteComment);

module.exports = router;
