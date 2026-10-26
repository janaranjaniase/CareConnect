const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/chatbotController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('patient'), chat);

module.exports = router;