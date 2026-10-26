const express = require('express');
const router = express.Router();
const { createSchedule, getScheduleByDoctor } = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('admin', 'doctor'), createSchedule);
router.get('/:doctorId', getScheduleByDoctor);

module.exports = router;