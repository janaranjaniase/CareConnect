const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');

// Today's date in Indian time, same format as appointments: "2026-10-18"
function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

exports.chat = async (req, res) => {
  try {
    const message = (req.body.message || '').toLowerCase().trim();
    if (!message) {
      return res.status(400).json({ message: 'Please type a message' });
    }

    const has = (...words) => words.some(w => message.includes(w));
    let reply;

    // 1. Greeting
    if (['hi', 'hello', 'hey'].includes(message) || has('good morning', 'good evening')) {
      reply = 'Hello! I am the CareConnect assistant. You can ask me how to book or cancel an appointment, your queue status, your next appointment, or which doctors are in a department.';

    // 2. Medical questions are not allowed
    } else if (has('diagnos', 'symptom', 'medicine', 'treatment', 'disease', 'pain')) {
      reply = 'Sorry, I cannot give medical advice. Please book an appointment and speak with a doctor.';

    // 3. How to cancel
    } else if (has('cancel')) {
      reply = 'To cancel, open My Appointments, find the appointment and click Cancel. The slot becomes available for others.';

    // 4. How to reschedule
    } else if (has('reschedule', 'change my appointment')) {
      reply = 'To change your appointment time, cancel the current appointment and book a new slot.';

    // 5. How to book
    } else if (has('how') && has('book')) {
      reply = 'To book: open Book Appointment, choose a department and doctor, pick a date and an available time slot, then confirm.';

    // 6. Queue status
    } else if (has('ahead', 'queue', 'token', 'wait')) {
      const appt = await Appointment.findOne({
        patient: req.user.id,
        date: todayIST(),
        status: { $in: ['waiting', 'in-consultation'] }
      });

      if (!appt) {
        reply = 'You are not in a queue right now. Ask the reception to check you in when you arrive.';
      } else if (appt.status === 'in-consultation') {
        reply = `Your token is ${appt.tokenNumber}. You are with the doctor now.`;
      } else {
        const waitingList = await Appointment.find({
          doctor: appt.doctor,
          date: appt.date,
          status: 'waiting'
        });
        const rank = { emergency: 0, urgent: 1, high: 2, normal: 3 };
        waitingList.sort((a, b) => {
          if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
          return parseInt(a.tokenNumber.slice(1)) - parseInt(b.tokenNumber.slice(1));
        });
        const ahead = waitingList.findIndex(a => a._id.toString() === appt._id.toString());
        const doctor = await Doctor.findById(appt.doctor);
        reply = `Your token is ${appt.tokenNumber}. There are ${ahead} patients ahead of you. Estimated wait: ${ahead * doctor.avgConsultationTime} minutes.`;
      }

    // 7. My appointments / what time
    } else if (has('what time', 'my appointment', 'next appointment', 'my appointments')) {
      const upcoming = await Appointment.find({
        patient: req.user.id,
        date: { $gte: todayIST() },
        status: { $in: ['confirmed', 'waiting', 'in-consultation'] }
      })
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
        .sort({ date: 1, time: 1 });

      if (upcoming.length === 0) {
        reply = 'You have no upcoming appointments.';
      } else {
        const lines = upcoming.map(a => `${a.date} at ${a.time} with ${a.doctor.user.name} (${a.status})`);
        reply = 'Your upcoming appointments:\n' + lines.join('\n');
      }

    // 8. Doctors in a department, or doctors available today
    } else if (has('doctor', 'department')) {
      const departments = await Department.find();
      const matched = departments.find(d => message.includes(d.name.toLowerCase()));

      if (matched) {
        const doctors = await Doctor.find({ department: matched._id }).populate('user', 'name');
        reply = doctors.length === 0
          ? `There are no doctors listed in ${matched.name} yet.`
          : `Doctors in ${matched.name}:\n` + doctors.map(d => `${d.user.name} (${d.status})`).join('\n');
      } else if (has('available', 'today')) {
        const doctors = await Doctor.find({ status: 'available' }).populate('user', 'name').populate('department', 'name');
        reply = doctors.length === 0
          ? 'No doctors are marked available right now.'
          : 'Doctors available now:\n' + doctors.map(d => `${d.user.name} - ${d.department.name}`).join('\n');
      } else {
        reply = 'Departments: ' + departments.map(d => d.name).join(', ') + '. Ask me, for example, "Which doctors are in Cardiology?"';
      }

    // 9. Anything else
    } else {
      reply = 'Sorry, I did not understand that. Try: "How do I book?", "How many patients are ahead of me?", "What is my next appointment?" or "Which doctors are in Cardiology?"';
    }

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};