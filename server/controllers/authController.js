const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const DoctorSchedule = require('../models/DoctorSchedule');

// REGISTER a new user
// REGISTER a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, departmentId, specialization } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 2. A doctor must choose a department and a specialization
    if (role === 'doctor') {
      if (!departmentId || !specialization) {
        return res.status(400).json({ message: 'Doctors must select a department and enter a specialization' });
      }
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({ message: 'Selected department does not exist' });
      }
    }

    // 3. Hash (scramble) the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the user in the database
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'patient',
      phone
    });

    // 5. For a doctor, also create the doctor profile
        // 5. For a doctor, also create the doctor profile and a default weekly schedule
    if (role === 'doctor') {
      let doctor;
      try {
        doctor = await Doctor.create({
          user: newUser._id,
          department: departmentId,
          specialization
        });

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        await DoctorSchedule.insertMany(
          days.map((day) => ({
            doctor: doctor._id,
            dayOfWeek: day,
            startTime: '10:00',
            endTime: '13:00',
            slotDurationMinutes: 20
          }))
        );
      } catch (profileErr) {
        // Undo everything so we never leave a half-created doctor
        if (doctor) {
          await DoctorSchedule.deleteMany({ doctor: doctor._id });
          await Doctor.findByIdAndDelete(doctor._id);
        }
        await User.findByIdAndDelete(newUser._id);
        throw profileErr;
      }
    }

    res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// LOGIN an existing user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 2. Compare the entered password with the hashed one in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 3. Create a JWT token — this is the user's "login pass"
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};