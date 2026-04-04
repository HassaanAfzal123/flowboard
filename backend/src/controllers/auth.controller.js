const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const result = await authService.register({ name, email, password });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await authService.login({ email, password });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await authService.getMe(userId);

    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  login,
  me,
};

