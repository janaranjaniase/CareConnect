const express = require('express');
const router = express.Router();

const {
  getAvailableSlots, bookAppointment, getMyAppointments, cancelAppointment, checkInAppointment, getQueueStatus, getDoctorQueue, startConsultation, completeConsultation, markNoShow, setPriority, addMedicalRecord, getMyHistory, getPatientHistory, getAppointmentsByDate
} = require('../controllers/appointmentController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Anyone can view available slots
router.get('/slots', getAvailableSlots);

// Only patients can book
router.post('/', protect, authorize('patient'), bookAppointment);

// Only patients can view their appointments
router.get('/my', protect, authorize('patient'), getMyAppointments);

// Only patients can cancel their own appointments
router.patch('/:id/cancel', protect, authorize('patient'), cancelAppointment);

router.patch('/:id/check-in', protect, authorize('staff', 'admin'), checkInAppointment);

router.get('/:id/queue', protect, authorize('patient', 'staff', 'admin', 'doctor'), getQueueStatus);

router.get('/queue', protect, authorize('staff', 'admin', 'doctor'), getDoctorQueue);

router.patch('/:id/start', protect, authorize('doctor', 'staff', 'admin'), startConsultation);

router.patch('/:id/complete', protect, authorize('doctor', 'staff', 'admin'), completeConsultation);

router.patch('/:id/no-show', protect, authorize('doctor', 'staff', 'admin'), markNoShow);

router.patch('/:id/priority', protect, authorize('staff', 'admin'), setPriority);

router.post('/:id/record', protect, authorize('doctor', 'admin'), addMedicalRecord);

router.get('/history/my', protect, authorize('patient'), getMyHistory);

router.get('/history/patient/:patientId', protect, authorize('doctor', 'admin'), getPatientHistory);

router.get('/day', protect, authorize('staff', 'admin', 'doctor'), getAppointmentsByDate);

module.exports = router;
