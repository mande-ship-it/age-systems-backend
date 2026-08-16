const express = require('express');
const router = express.Router();
const {
    getScholarPerformance,
    getCohortAnalytics,
    getSubjectPerformance,
    getRiskIndicators,
    getEngagementImpact
} = require('../controllers/performanceController');
const auth = require('../middleware/authMiddleware');

router.get('/scholar/:scholarId', auth, getScholarPerformance);
router.get('/cohort', auth, getCohortAnalytics);
router.get('/subjects', auth, getSubjectPerformance);
router.get('/risk-indicators', auth, getRiskIndicators);
router.get('/engagement-impact', auth, getEngagementImpact);

module.exports = router;
