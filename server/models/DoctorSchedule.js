const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: { type: String, required: true }, // e.g. "10:00"
  endTime: { type: String, required: true },   // e.g. "13:00"
  slotDurationMinutes: { type: Number, default: 20 }, // how long each appointment slot is
  isAvailable: { type: Boolean, default: true }, // lets a doctor mark a whole day as unavailable
}, { timestamps: true });

module.exports = mongoose.model('DoctorSchedule', scheduleSchema);