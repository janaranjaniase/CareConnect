const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// Anyone logged in can access this
router.get('/profile', protect, (req, res) => {
  res.json({ message: 'You are logged in', user: req.user });
});

// Only admins can access this
router.get('/admin-only', protect, authorize('admin'), (req, res) => {
  res.json({ message: 'Welcome, admin!' });
});

module.exports = router;