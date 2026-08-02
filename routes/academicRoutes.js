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
router.post('/record', recordResultsRules, validate, recordResults);

// Results Retrieval & Analysis
router.get('/results', getScholarResults);
router.get('/results/by-school', getSchoolResults);
router.get('/completeness/:scholarId/:year', checkResultCompleteness);
router.get('/scholar/:scholarId', getScholarResults);
router.get('/stats/:year', getYearlyStats);

// School lookup for results view
router.get('/schools-with-results', getSchoolsWithResults);

// Subject Registry
router.get('/subjects', getSubjectRegistry);
router.post('/subjects', createSubjectRules, validate, createSubject);
router.delete('/subjects/:id', deleteSubject);

module.exports = router;
