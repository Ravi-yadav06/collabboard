const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    }

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    }

    const secret = process.env.JWT_SECRET || 'collabboard_super_secret_jwt_key_2026_antigravity';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found or token is invalid.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

module.exports = authMiddleware;
