const express = require('express');
const router = express.Router();
const { createDoctorProfile, getDoctors, updateDoctorStatus } = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('admin'), createDoctorProfile);
router.get('/', getDoctors);
router.patch('/status', protect, authorize('doctor'), updateDoctorStatus);

module.exports = router;