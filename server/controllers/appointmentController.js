const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorSchedule = require('../models/DoctorSchedule');
const { generateSlots } = require('../utils/slotHelper');
const MedicalRecord = require('../models/MedicalRecord');

// Convert a date string like "2026-09-29" into the day name
function getDayName(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(dateStr).getDay()];
}

// GET available slots for one doctor on one date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const dayName = getDayName(date);

    // 1. Find this doctor's schedule for that day
    const schedule = await DoctorSchedule.findOne({
      doctor: doctorId,
      dayOfWeek: dayName,
      isAvailable: true
    });

    if (!schedule) {
      return res.json({ slots: [] });
    }

    // 2. Generate all possible slots
    const allSlots = generateSlots(
      schedule.startTime,
      schedule.endTime,
      schedule.slotDurationMinutes
    );

    // 3. Find already-booked appointments
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      date,
      status: { $ne: 'cancelled' }
    });

    const bookedTimes = bookedAppointments.map(a => a.time);

    // 4. Mark each slot as available or unavailable
    const slotsWithStatus = allSlots.map(time => ({
      time,
      available: !bookedTimes.includes(time)
    }));

    res.json({ slots: slotsWithStatus });

  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

// BOOK an appointment
// BOOK an appointment (the department is taken from the doctor's profile)
exports.bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;
    const patientId = req.user.id; // comes from the JWT, via the `protect` middleware

    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: 'doctorId, date and time are required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctor._id,
      department: doctor.department,
      date,
      time
    });

    res.status(201).json({ message: 'Appointment booked successfully', appointment });
  } catch (err) {
    // Error code 11000 = MongoDB's "duplicate key" error, our unique index kicking in
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This slot was just booked by someone else. Please choose another.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET a patient's own appointments
exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.user.id
    })
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'name'
        }
      })
      .populate('department', 'name')
      .sort({ date: 1, time: 1 });

    res.json(appointments);

  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

// CANCEL an appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        patient: req.user.id
      },
      {
        status: 'cancelled'
      },
      {
        new: true
      }
    );

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found'
      });
    }

    res.json({
      message: 'Appointment cancelled',
      appointment
    });

  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

// STAFF: check in a patient and give them a token number
exports.checkInAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only a confirmed appointment can be checked in
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        message: `Cannot check in an appointment with status "${appointment.status}"`
      });
    }

        // Check-in is only allowed on the day of the appointment
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (appointment.date !== today) {
      return res.status(400).json({
        message: `Check-in is only allowed on the appointment date (${appointment.date}). Today is ${today}.`
      });
    }

    // Count tokens already given to this doctor on this date
    const tokensIssued = await Appointment.countDocuments({
      doctor: appointment.doctor,
      date: appointment.date,
      tokenNumber: { $exists: true, $ne: null }
    });

    // Next token = count + 1, written as T01, T02, T03...
    appointment.tokenNumber = 'T' + String(tokensIssued + 1).padStart(2, '0');
    appointment.status = 'waiting';
    await appointment.save();

    res.json({ message: 'Patient checked in', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Queue status for one appointment: position, patients ahead, estimated wait
exports.getQueueStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // A patient may only see their own appointment
    if (req.user.role === 'patient' && appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only view your own queue information' });
    }

    // Only a patient who has checked in is in the queue
    if (appointment.status !== 'waiting') {
      return res.status(400).json({
        message: `This appointment is not in the queue (status: "${appointment.status}")`
      });
    }

    // Everyone waiting for the same doctor on the same date
    const waitingList = await Appointment.find({
      doctor: appointment.doctor,
      date: appointment.date,
      status: 'waiting'
    });

    // Order: priority first, then earlier token first
    const priorityRank = { emergency: 0, urgent: 1, high: 2, normal: 3 };
    waitingList.sort((a, b) => {
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }
      return parseInt(a.tokenNumber.slice(1)) - parseInt(b.tokenNumber.slice(1));
    });

    // My place in that ordered list
    const index = waitingList.findIndex(a => a._id.toString() === appointment._id.toString());
    const patientsAhead = index;

    // Estimated wait = patients ahead x doctor's average consultation time
    const doctor = await Doctor.findById(appointment.doctor);
    const estimatedWaitMinutes = patientsAhead * doctor.avgConsultationTime;

    res.json({
      tokenNumber: appointment.tokenNumber,
      status: appointment.status,
      position: index + 1,
      patientsAhead,
      estimatedWaitMinutes
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// STAFF / DOCTOR / ADMIN: see the full waiting queue for one doctor on one date
exports.getDoctorQueue = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'doctorId and date are required' });
    }

    const waitingList = await Appointment.find({
      doctor: doctorId,
      date,
      status: { $in: ['waiting', 'in-consultation'] }
    }).populate('patient', 'name');

    // The patient currently with the doctor
    const current = waitingList.find(a => a.status === 'in-consultation') || null;

    // Everyone still waiting, ordered by priority then token
    const priorityRank = { emergency: 0, urgent: 1, high: 2, normal: 3 };
    const queue = waitingList
      .filter(a => a.status === 'waiting')
      .sort((a, b) => {
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
        return parseInt(a.tokenNumber.slice(1)) - parseInt(b.tokenNumber.slice(1));
      })
      .map((a, i) => ({
        position: i + 1,
        tokenNumber: a.tokenNumber,
        patientName: a.patient.name,
        time: a.time,
        priority: a.priority,
        appointmentId: a._id
      }));

    res.json({
      currentlyServing: current ? current.tokenNumber : null,
      waitingCount: queue.length,
      queue
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DOCTOR / STAFF / ADMIN: call a waiting patient in to see the doctor
exports.startConsultation = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'waiting') {
      return res.status(400).json({
        message: `Cannot start consultation for status "${appointment.status}"`
      });
    }

    // A doctor can only see one patient at a time
    const alreadyInside = await Appointment.findOne({
      doctor: appointment.doctor,
      date: appointment.date,
      status: 'in-consultation'
    });
    if (alreadyInside) {
      return res.status(400).json({
        message: `Token ${alreadyInside.tokenNumber} is still in consultation. Complete it first.`
      });
    }

    appointment.status = 'in-consultation';
    await appointment.save();

    res.json({ message: 'Consultation started', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DOCTOR / STAFF / ADMIN: finish the consultation
exports.completeConsultation = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status !== 'in-consultation') {
      return res.status(400).json({
        message: `Cannot complete an appointment with status "${appointment.status}"`
      });
    }

    appointment.status = 'completed';
    await appointment.save();

    res.json({ message: 'Consultation completed', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DOCTOR / STAFF / ADMIN: mark a patient who did not show up
exports.markNoShow = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!['confirmed', 'waiting'].includes(appointment.status)) {
      return res.status(400).json({
        message: `Cannot mark no-show for status "${appointment.status}"`
      });
    }

    appointment.status = 'no-show';
    await appointment.save();

    res.json({ message: 'Patient marked as no-show', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// STAFF / ADMIN: set the priority of an appointment (emergency, urgent, high, normal)
exports.setPriority = async (req, res) => {
  try {
    const { priority } = req.body;
    const allowed = ['emergency', 'urgent', 'high', 'normal'];

    if (!allowed.includes(priority)) {
      return res.status(400).json({
        message: `Priority must be one of: ${allowed.join(', ')}`
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Priority only matters while the patient is still waiting to be seen
    if (!['confirmed', 'waiting'].includes(appointment.status)) {
      return res.status(400).json({
        message: `Cannot change priority for status "${appointment.status}"`
      });
    }

    appointment.priority = priority;
    await appointment.save();

    res.json({ message: 'Priority updated', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DOCTOR (or admin): add the medical record for a visit
exports.addMedicalRecord = async (req, res) => {
  try {
    const { visitReason, notes, diagnosis, prescription, followUpDate } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // A doctor may only write records for their own patients
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user.id });
      if (!doctor || doctor._id.toString() !== appointment.doctor.toString()) {
        return res.status(403).json({ message: 'You can only add records for your own appointments' });
      }
    }

    // The visit must have started or finished
    if (!['in-consultation', 'completed'].includes(appointment.status)) {
      return res.status(400).json({
        message: `Cannot add a record for status "${appointment.status}"`
      });
    }

    // One record per appointment
    const existing = await MedicalRecord.findOne({ appointment: appointment._id });
    if (existing) {
      return res.status(409).json({ message: 'A record already exists for this appointment' });
    }

    const record = await MedicalRecord.create({
      appointment: appointment._id,
      patient: appointment.patient,
      doctor: appointment.doctor,
      visitReason,
      notes,
      diagnosis,
      prescription,
      followUpDate
    });

    res.status(201).json({ message: 'Medical record saved', record });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PATIENT: see my own medical history
exports.getMyHistory = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patient: req.user.id })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'appointment', select: 'date time' })
      .sort({ createdAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DOCTOR / ADMIN: see the history of one patient
exports.getPatientHistory = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patient: req.params.patientId })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'appointment', select: 'date time' })
      .sort({ createdAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// STAFF / DOCTOR / ADMIN: all appointments on one date (optionally for one doctor)
exports.getAppointmentsByDate = async (req, res) => {
  try {
    const { date, doctorId } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }

    const filter = { date, status: { $ne: 'cancelled' } };
    if (doctorId) filter.doctor = doctorId;

    const appointments = await Appointment.find(filter)
      .populate('patient', 'name')
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
      .populate('department', 'name')
      .sort({ time: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};