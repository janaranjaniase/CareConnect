const express = require('express');
const router = express.Router();
const { createDepartment, getDepartments } = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('admin'), createDepartment); // only admin can create
router.get('/', getDepartments); // anyone can view the list (patients need this to browse)

module.exports = router;