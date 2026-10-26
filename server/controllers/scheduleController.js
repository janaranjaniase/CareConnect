const DoctorSchedule = require('../models/DoctorSchedule');
const Doctor = require('../models/Doctor');

// Admin or the doctor themself sets a working day
exports.createSchedule = async (req, res) => {
  try {
    const { doctorId, dayOfWeek, startTime, endTime, slotDurationMinutes } = req.body;
    const schedule = await DoctorSchedule.create({
      doctor: doctorId, dayOfWeek, startTime, endTime, slotDurationMinutes
    });
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all schedule entries for one doctor
exports.getScheduleByDoctor = async (req, res) => {
  try {
    const schedules = await DoctorSchedule.find({ doctor: req.params.doctorId });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};