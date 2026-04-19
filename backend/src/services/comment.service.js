const Comment = require('../models/comment.model');
const taskService = require('./task.service');

async function listCommentsForTask(taskId, userId) {
  await taskService.ensureTaskAccess(taskId, userId);

  const comments = await Comment.find({ taskId })
    .sort({ createdAt: 1 })
    .populate('userId', 'name email')
    .lean();

  return comments.map((c) => ({
    id: c._id,
    body: c.body,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    user: c.userId,
  }));
}

async function createComment(taskId, userId, body) {
  await taskService.ensureTaskAccess(taskId, userId);

  const comment = await Comment.create({
    taskId,
    userId,
    body: body.trim(),
  });

  await comment.populate('userId', 'name email');

  return {
    id: comment._id,
    body: comment.body,
    createdAt: comment.createdAt,
    user: {
      id: comment.userId._id,
      name: comment.userId.name,
      email: comment.userId.email,
    },
  };
}

async function updateComment(commentId, userId, body) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  await taskService.ensureTaskAccess(comment.taskId, userId);

  if (comment.userId.toString() !== userId.toString()) {
    const error = new Error('You can only edit your own comments');
    error.statusCode = 403;
    throw error;
  }

  comment.body = body.trim();
  await comment.save();

  return {
    id: comment._id,
    body: comment.body,
    updatedAt: comment.updatedAt,
  };
}

async function deleteComment(commentId, userId) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  const { role } = await taskService.ensureTaskAccess(comment.taskId, userId);

  const isAuthor = comment.userId.toString() === userId.toString();
  if (!isAuthor && role !== 'owner' && role !== 'admin') {
    const error = new Error('You do not have permission to delete this comment');
    error.statusCode = 403;
    throw error;
  }

  await Comment.findByIdAndDelete(commentId);
}

module.exports = {
  listCommentsForTask,
  createComment,
  updateComment,
  deleteComment,
};
