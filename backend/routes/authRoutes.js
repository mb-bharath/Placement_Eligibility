// routes/authRoutes.js
// Matches LoginScreen.js  →  POST /api/auth/login
// Replaces mockUsers with real DB authentication

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// ── Helper: generate JWT ─────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ── Helper: format user for response ────────────────────────
// Matches the user object format stored in AsyncStorage by LoginScreen.js
const formatUserResponse = (user, token) => ({
  success: true,
  token,
  user: {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name || '',
    registerNumber: user.registerNumber || '',
    department: user.department || '',
    cgpa: user.cgpa || null,
    backlogs: user.backlogs || 0,
  },
});

// ── POST /api/auth/login ─────────────────────────────────────
// Called by LoginScreen.js handleLogin()
// Body: { email, password }
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Find user + explicitly select password (select: false in model)
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account deactivated. Contact admin.',
        });
      }

      const token = generateToken(user._id);
      res.json(formatUserResponse(user, token));
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── POST /api/auth/register ──────────────────────────────────
// For student self-registration
// Body: { name, email, password, registerNumber }
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('registerNumber')
      .notEmpty()
      .withMessage('Register number is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, registerNumber } = req.body;

    try {
      // Check for existing user
      const existingUser = await User.findOne({
        $or: [{ email }, { registerNumber }],
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            existingUser.email === email
              ? 'Email already registered'
              : 'Register number already exists',
        });
      }

      // Create student (role defaults to 'student')
      const user = await User.create({
        name,
        email,
        password,
        registerNumber,
        role: 'student',
      });

      const token = generateToken(user._id);
      res.status(201).json(formatUserResponse(user, token));
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── POST /api/auth/create-admin ──────────────────────────────
// One-time use: create first admin (protect in production)
// Body: { name, email, password, secretKey }
router.post('/create-admin', async (req, res) => {
  const { name, email, password, secretKey } = req.body;

  // Basic secret check (change this in production)
  if (secretKey !== 'BITSATHY_ADMIN_2024') {
    return res.status(403).json({ success: false, message: 'Invalid secret key' });
  }

  try {
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'Admin already exists' });
    }

    const admin = await User.create({ name, email, password, role: 'admin' });
    const token = generateToken(admin._id);
    res.status(201).json(formatUserResponse(admin, token));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
// Get current logged-in user info
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
