require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
//hello
const app = express();
const authRoutes = require('./routes/auth.routes');
const organizationRoutes = require('./routes/organization.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const commentRoutes = require('./routes/comment.routes');
const notificationRoutes = require('./routes/notification.routes');

function inferErrorCode(status, message) {
  if (status === 401) {
    if (message === 'Authorization token missing') return 'AUTH_TOKEN_MISSING';
    if (message === 'Invalid or expired token') return 'AUTH_INVALID_TOKEN';
    return 'AUTH_REQUIRED';
  }

  if (message === 'You are not a member of this organization') return 'ORG_MEMBERSHIP_REQUIRED';
  if (message === 'Organization not found') return 'ORGANIZATION_NOT_FOUND';
  if (message === 'Project not found') return 'PROJECT_NOT_FOUND';
  if (message === 'Task not found') return 'TASK_NOT_FOUND';
  if (message === 'Comment not found') return 'COMMENT_NOT_FOUND';
  if (message === 'Member not found in this organization') return 'MEMBER_NOT_FOUND';

  if (status === 404) return 'RESOURCE_NOT_FOUND';
  if (status === 403) return 'FORBIDDEN';
  if (status === 400) return 'BAD_REQUEST';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'REQUEST_FAILED';
}

function buildCorsOptions() {
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) {
    return {};
  }

  return {
    origin(origin, callback) {
      // Allow non-browser clients and same-origin requests with no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
  };
}

// Core middlewares
app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(morgan('dev'));

// Health check must be mounted before auth-protected /api routers.
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api', commentRoutes);
app.use('/api', notificationRoutes);

// Basic error handler (to be expanded later)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.errorCode || inferErrorCode(status, message);
  res.status(status).json({ message, code });
});

module.exports = app;

