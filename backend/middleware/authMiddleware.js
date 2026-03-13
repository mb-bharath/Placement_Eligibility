// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect: verify token ────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // 1. Check Authorization header  →  Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Optional: allow token via query for download links
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login first.',
    });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach user to request (exclude password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token may be invalid.',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
    });
  }
};

// ── Admin Only ────────────────────────────────────────────────
// Use after protect middleware
// Usage: router.delete('/company/:id', protect, adminOnly, deleteCompany)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
};

module.exports = { protect, adminOnly };
