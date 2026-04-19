const commentService = require('../services/comment.service');

async function listComments(req, res, next) {
  try {
    const { id: taskId } = req.params;
    const comments = await commentService.listCommentsForTask(taskId, req.user.id);
    return res.status(200).json({ comments });
  } catch (err) {
    return next(err);
  }
}

async function createComment(req, res, next) {
  try {
    const { id: taskId } = req.params;
    const { body } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: 'Body is required' });
    }

    const comment = await commentService.createComment(taskId, req.user.id, body);
    return res.status(201).json({ comment });
  } catch (err) {
    return next(err);
  }
}

async function updateComment(req, res, next) {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: 'Body is required' });
    }

    const comment = await commentService.updateComment(id, req.user.id, body);
    return res.status(200).json({ comment });
  } catch (err) {
    return next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const { id } = req.params;
    await commentService.deleteComment(id, req.user.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listComments,
  createComment,
  updateComment,
  deleteComment,
};
