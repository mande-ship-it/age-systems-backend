const express = require('express');
const router = express.Router();

const { 
    recordSession,
    getHistory,
    getSessionById,
    getAttendanceAnalytics,
    getSchoolAttendanceReport
} = require('../controllers/attendanceController');

const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Analytics & Reports
router.get('/analytics', getAttendanceAnalytics);
router.get('/report', getHistory); // Use history for general list
router.get('/school-report/:schoolId', getSchoolAttendanceReport);

// Session History
router.get('/history', getHistory);
router.get('/session/:id', getSessionById);

// Recording Attendance (Marking Register)
router.post('/record', recordSession);

module.exports = router;
