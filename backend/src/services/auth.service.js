const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. JWT-based auth will not work correctly until it is configured.');
}

function generateToken(userId) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.password;
  return obj;
}

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error('Email is already in use');
    error.statusCode = 409;
    throw error;
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashed,
  });

  const token = generateToken(user._id.toString());

  return {
    user: sanitizeUser(user),
    token,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id.toString());

  return {
    user: sanitizeUser(user),
    token,
  };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return sanitizeUser(user);
}

module.exports = {
  register,
  login,
  getMe,
};

