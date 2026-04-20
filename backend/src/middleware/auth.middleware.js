const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing', code: 'AUTH_TOKEN_MISSING' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ message: 'JWT secret is not configured', code: 'INTERNAL_ERROR' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token', code: 'AUTH_INVALID_TOKEN' });
  }
}

module.exports = authMiddleware;

