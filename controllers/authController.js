const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Please enter all required fields.');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long.');
    }

    // Check existing email or username
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      res.status(400);
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('An account with this email already exists.');
      }
      throw new Error('Username is already taken.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password.');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(400);
      throw new Error('Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error('Invalid credentials.');
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getCurrentUser = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
