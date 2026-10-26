const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  specialization: { type: String, required: true },
  status: {
    type: String,
    enum: ['available', 'busy', 'on_break', 'offline'],
    default: 'offline'
  },
  avgConsultationTime: { type: Number, default: 15 }, // in minutes, used later for queue wait-time math
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);