const Department = require('../models/Department');

exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    const dept = await Department.create({ name, description });
    res.status(201).json(dept);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};