const express = require('express');
const router = express.Router();

const { 
    recordSession,
    getHistory,
    getSessionById,
    getAttendanceAnalytics,
    getSchoolAttendanceReport,
    getScholarAttendanceHistory
} = require('../controllers/attendanceController');

const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Analytics & Reports
router.get('/analytics', auth, getAttendanceAnalytics);
router.get('/report', auth, getHistory); // Use history for general list
router.get('/school-report/:schoolId', auth, getSchoolAttendanceReport);

// Session History
router.get('/history', auth, getHistory);
router.get('/session/:id', auth, getSessionById);

// Recording Attendance (Marking Register)
router.post('/record', auth, recordSession);

// Individual Scholar History
router.get('/scholar/:scholarId', auth, getScholarAttendanceHistory);

module.exports = router;
