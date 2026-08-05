const express = require('express');
const router = express.Router();

const {
    recordResults,
    getScholarResults,
    getSchoolResults,
    getYearlyStats,
    getSubjectRegistry,
    createSubject,
    deleteSubject,
    checkResultCompleteness,
    getSchoolsWithResults
} = require('../controllers/academicController');

const { recordResultsRules, createSubjectRules } = require('../validations/academicValidation');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Results Recording
router.post('/record', auth, recordResultsRules, validate, recordResults);

// Results Retrieval & Analysis
router.get('/results', auth, getScholarResults);
router.get('/results/by-school', auth, getSchoolResults);
router.get('/completeness/:scholarId/:year', auth, checkResultCompleteness);
router.get('/scholar/:scholarId', auth, getScholarResults);
router.get('/stats/:year', auth, getYearlyStats);

// School lookup for results view
router.get('/schools-with-results', auth, getSchoolsWithResults);

// Subject Registry
router.get('/subjects', auth, getSubjectRegistry);
router.post('/subjects', auth, createSubjectRules, validate, createSubject);
router.delete('/subjects/:id', auth, deleteSubject);

module.exports = router;
