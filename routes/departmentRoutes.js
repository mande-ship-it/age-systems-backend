const express = require('express');
const router = express.Router();
const {
    getAllDepartments,
    getAllDepartmentsWithCounts,
    getDepartmentUsers,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// All routes here are protected
router.use(auth);

router.get('/', getAllDepartments);
router.get('/with-counts', getAllDepartmentsWithCounts);
router.get('/:id/users', getDepartmentUsers);

// Modifications require Administrator role
router.post('/', authorize(['Administrator']), createDepartment);
router.put('/:id', authorize(['Administrator']), updateDepartment);
router.delete('/:id', authorize(['Administrator']), deleteDepartment);

module.exports = router;
