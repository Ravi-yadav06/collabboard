const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'collabboard_super_secret_jwt_key_2026_antigravity';
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email },
    secret,
    { expiresIn: '7d' }
  );
};

module.exports = generateToken;
