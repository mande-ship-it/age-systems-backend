const express = require('express');
const router = express.Router();

const { 
    getAllScholars, 
    getScholarById, 
    createScholar, 
    updateScholar, 
    approveScholar,
    deleteScholar,
    getScholarsBySchool,
    getUniversityGraduates,
    getAlumni,
    getScholarStats
} = require('../controllers/scholarController');

const { createScholarRules, updateScholarRules } = require('../validations/scholarValidation');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Lookups
router.get('/stats', auth, getScholarStats);
router.get('/by-school', auth, getScholarsBySchool);
router.get('/graduates', auth, getUniversityGraduates);
router.get('/alumni', auth, getAlumni);

// Scholar list and creation
router.get('/', auth, getAllScholars);
router.post('/', auth, authorize(['Administrator', 'Program Coordinator', 'Data Officer']), createScholarRules, validate, createScholar);

// Single scholar routes
router.get('/:id', auth, getScholarById);
router.put('/:id', auth, authorize(['Administrator', 'Program Coordinator', 'Country Director']), updateScholarRules, validate, updateScholar);
router.patch('/:id/approve', auth, authorize(['Administrator', 'Program Coordinator', 'Country Director']), approveScholar);
router.delete('/:id', auth, authorize(['Administrator', 'Program Coordinator', 'Country Director']), deleteScholar);

module.exports = router;
