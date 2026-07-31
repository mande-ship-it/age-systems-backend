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
    checkResultCompleteness
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
router.get('/schools-with-results', async (req, res, next) => {
    try {
        const pool = require('../config/database');
        const sql = `
            SELECT DISTINCT COALESCE(sch.name, s.school_name) as name
            FROM academic_results r
            JOIN scholars s ON r.scholar_id = s.id
            LEFT JOIN schools sch ON s.school_id = sch.id
            ORDER BY name ASC
        `;
        const result = await pool.query(sql);
        const { successResponse } = require('../utils/response');
        return successResponse(res, result.rows, 'Schools with academic results retrieved.');
    } catch (err) {
        next(err);
    }
});

// Subject Registry
router.get('/subjects', getSubjectRegistry);
router.post('/subjects', createSubjectRules, validate, createSubject);
router.delete('/subjects/:id', deleteSubject);

module.exports = router;
