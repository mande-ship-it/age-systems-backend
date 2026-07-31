const express = require('express');
const router = express.Router();

const { 
    createSchool, 
    getAllSchools, 
    getSchoolById, 
    updateSchool, 
    deleteSchool,
    toggleSchoolStatus,
    getScholarsForPromotion,
    promoteScholar
} = require('../controllers/schoolController');

const { schoolRules } = require('../validations/schoolValidation');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Standard School CRUD
router.get('/', auth, getAllSchools);
router.get('/:id', auth, getSchoolById);
router.post('/', auth, authorize(['Admin', 'Country Director']), schoolRules, validate, createSchool);
router.put('/:id', auth, authorize(['Admin', 'Country Director']), schoolRules, validate, updateSchool);
router.patch('/:id/status', auth, authorize(['Admin', 'Country Director']), toggleSchoolStatus);
router.delete('/:id', auth, authorize(['Admin']), deleteSchool);

// Scholar Progression (Promote logic)
router.get('/progression/review', auth, authorize(['Admin', 'Country Director']), getScholarsForPromotion);
router.post('/promote/:id', auth, authorize(['Admin', 'Country Director']), promoteScholar);

module.exports = router;
