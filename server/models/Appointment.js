const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  date: { type: String, required: true },   // e.g. "2026-09-29"
  time: { type: String, required: true },   // e.g. "11:00"
  tokenNumber: { type: String },            // e.g. "C27", assigned at check-in
  status: {
    type: String,
    enum: ['confirmed', 'checked-in', 'waiting', 'in-consultation', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'confirmed'
  },
  priority: {
    type: String,
    enum: ['emergency', 'urgent', 'high', 'normal'],
    default: 'normal'
  },
}, { timestamps: true });

// THIS is the double-booking guard: MongoDB itself will reject
// two appointments with the same doctor + date + time, as long as
// they're both still "active" (not cancelled). We enforce that below.
appointmentSchema.index(
  { doctor: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);