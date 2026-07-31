const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Record a new attendance session
 */
const recordSession = async (req, res, next) => {
    try {
        const session = await AttendanceSession.create(req.body);

        await NotificationService.notifyAll(`📋 Attendance recorded: ${req.body.sessionType} at ${req.body.schoolName || 'Institution'}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, session, 'Attendance register saved successfully.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Get attendance history with filters
 */
const getHistory = async (req, res, next) => {
    try {
        const { type, schoolId, schoolName, month, week_number, term, semester } = req.query;
        const history = await AttendanceSession.getAll({
            type,
            schoolId,
            schoolName,
            month,
            week_number,
            term,
            semester
        });
        return successResponse(res, history, 'Attendance history retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get session details by ID
 */
const getSessionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const session = await AttendanceSession.findById(id);
        if (!session) {
            return errorResponse(res, 'Attendance session not found.', 404);
        }
        return successResponse(res, session, 'Session details retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get Attendance Analytics / Reports
 */
const getAttendanceAnalytics = async (req, res, next) => {
    try {
        const [stats, trends, summary, alerts] = await Promise.all([
            Attendance.getGlobalStats(),
            Attendance.getMonthlyTrends(),
            Attendance.getSchoolWiseSummary(),
            Attendance.getAlerts()
        ]);

        return successResponse(res, {
            stats,
            trends,
            summary,
            alerts
        }, 'Attendance analytics retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get detailed report for a school with targets
 */
const getSchoolAttendanceReport = async (req, res, next) => {
    try {
        const { schoolId } = req.params;
        const { month, term, semester, week_number, year } = req.query;

        const report = await Attendance.getReportBySchool(schoolId, {
            month,
            term,
            semester,
            week_number,
            year
        });

        return successResponse(res, report, 'School attendance report generated.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    recordSession,
    getHistory,
    getSessionById,
    getAttendanceAnalytics,
    getSchoolAttendanceReport
};
