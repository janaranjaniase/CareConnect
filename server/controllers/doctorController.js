const Doctor = require('../models/Doctor');

// Admin creates a doctor profile, linking an existing User (who registered with role "doctor") to a department
exports.createDoctorProfile = async (req, res) => {
  try {
    const { userId, departmentId, specialization, avgConsultationTime } = req.body;
    const doctor = await Doctor.create({
      user: userId,
      department: departmentId,
      specialization,
      avgConsultationTime
    });
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all doctors, optionally filtered by department — used for "Book by Department"
exports.getDoctors = async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;

    const doctors = await Doctor.find(filter)
      .populate('user', 'name email')       // pulls in name/email from the linked User
      .populate('department', 'name');       // pulls in the department name

    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Doctor updates their own status (available/busy/on_break/offline)
exports.updateDoctorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { user: req.user.id },
      { status },
      { new: true }
    );
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};