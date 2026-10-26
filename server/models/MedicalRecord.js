const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  visitReason: { type: String },
  notes: { type: String },
  diagnosis: { type: String },
  prescription: { type: String },
  followUpDate: { type: String }, // e.g. "2026-11-02"
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);