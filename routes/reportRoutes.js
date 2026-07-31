const express = require('express');
const router = express.Router();

const {
    getAttendanceReport,
    getScholarReport,
    getSchoolReport,
    getSponsorReport,
    exportToExcel,
    exportToPDF
} = require('../controllers/reportController');

const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Dashboard / UI Data Endpoints
router.get('/attendance', getAttendanceReport);
router.get('/scholars', getScholarReport);
router.get('/schools', getSchoolReport);
router.get('/sponsors', getSponsorReport);

// Export Portals
router.post('/export/excel', exportToExcel);
router.post('/export/pdf', exportToPDF);

module.exports = router;
