const mongoose = require('mongoose');
const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');
const School = require('../models/School');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');
const { applyDistrictFilter } = require('../utils/districtFilter');

/**
 * Record a new attendance session
 */
const recordSession = async (req, res, next) => {
    try {
        const { entries, ...sessionData } = req.body;

        // Map snake_case to camelCase
        if (sessionData.week_number) {
            sessionData.weekNumber = sessionData.week_number;
            delete sessionData.week_number;
        }

        const userRole = (req.user?.role || '').toLowerCase();
        const isFieldOfficer = userRole.includes('field');

        // Resolve district from the school
        if (sessionData.schoolId) {
            const school = await School.findById(sessionData.schoolId);
            if (school) {
                // Security check for field officers
                if (isFieldOfficer && req.user.assignedDistrict && school.district !== req.user.assignedDistrict) {
                    return errorResponse(res, 'Access denied. You can only record attendance for schools in your assigned district.', 403);
                }
                sessionData.district = school.district;
            }
        }

        // Final enforcement for field officers
        if (isFieldOfficer && req.user.assignedDistrict) {
            sessionData.district = req.user.assignedDistrict;
        }

        if (sessionData.month) sessionData.month = parseInt(sessionData.month);
        if (sessionData.year) sessionData.year = parseInt(sessionData.year);

        const session = new AttendanceSession(sessionData);
        await session.save();

        if (entries && entries.length > 0) {
            const attendanceEntries = entries.map(e => ({
                sessionId: session._id,
                scholarId: e.scholarId,
                status: e.status,
                notes: e.notes
            }));
            await Attendance.insertMany(attendanceEntries);
        }

        await NotificationService.notifyAll(`📋 Attendance recorded at ${req.body.schoolName || 'Institution'}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, session, 'Attendance register saved successfully.', 201);
    } catch (err) {
        next(err);
    }
};

const getHistory = async (req, res, next) => {
    try {
        const filters = applyDistrictFilter(req, req.query);

        // Map snake_case to camelCase for DB query
        if (filters.week_number) {
            filters.weekNumber = filters.week_number;
            delete filters.week_number;
        }

        // Convert string values to numbers for MongoDB if applicable
        if (filters.month) filters.month = parseInt(filters.month);
        if (filters.weekNumber) filters.weekNumber = parseInt(filters.weekNumber);
        if (filters.year) filters.year = parseInt(filters.year);

        const history = await AttendanceSession.find(filters).populate('schoolId').sort({ sessionDate: -1, created_at: -1 });

        // Add present/total counts for each session
        const enrichedHistory = await Promise.all(history.map(async (s) => {
            const counts = await Attendance.aggregate([
                { $match: { sessionId: s._id } },
                { $group: {
                    _id: null,
                    present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                    total: { $sum: 1 }
                }}
            ]);

            return {
                ...s.toObject(),
                school_name: s.schoolId ? s.schoolId.name : 'N/A',
                present_count: counts.length > 0 ? counts[0].present : 0,
                total_count: counts.length > 0 ? counts[0].total : 0
            };
        }));

        return successResponse(res, enrichedHistory, 'Attendance history retrieved.');
    } catch (err) {
        next(err);
    }
};

const getSessionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const session = await AttendanceSession.findById(id).populate('schoolId');
        if (!session) return errorResponse(res, 'Session not found.', 404);

        const entries = await Attendance.find({ sessionId: id })
            .populate({
                path: 'scholarId',
                select: 'fullName scholarId academicYear'
            });

        return successResponse(res, {
            ...session.toObject(),
            school_name: session.schoolId ? session.schoolId.name : 'N/A',
            entries
        });
    } catch (err) {
        next(err);
    }
};

const getAttendanceAnalytics = async (req, res, next) => {
    try {
        const stats = await Attendance.aggregate([
            { $group: {
                _id: "$status",
                count: { $sum: 1 }
            }}
        ]);

        const trends = await AttendanceSession.aggregate([
            { $lookup: {
                from: 'attendances',
                localField: '_id',
                foreignField: 'sessionId',
                as: 'logs'
            }},
            { $unwind: "$logs" },
            { $group: {
                _id: { $dateToString: { format: "%Y-%U", date: "$sessionDate" } },
                rate: { $avg: { $cond: [{ $eq: ["$logs.status", "present"] }, 100, 0] } }
            }},
            { $sort: { "_id": 1 } },
            { $limit: 4 }
        ]);

        return successResponse(res, {
            stats: stats.reduce((acc, curr) => { acc[curr._id] = curr.count; return acc; }, { total: stats.reduce((s, c) => s + c.count, 0) }),
            trends: trends.map(t => ({ week_start: t._id, attendance_rate: t.rate })),
            summary: [],
            alerts: []
        });
    } catch (err) {
        next(err);
    }
};

const getSchoolAttendanceReport = async (req, res, next) => {
    try {
        const { schoolId } = req.params;
        const { month, weekNumber, term, semester, year } = req.query;

        const sessionMatch = { schoolId: new mongoose.Types.ObjectId(schoolId) };
        if (month) sessionMatch.month = parseInt(month);
        if (weekNumber) sessionMatch.weekNumber = parseInt(weekNumber);
        if (year) sessionMatch.year = parseInt(year);
        if (term) sessionMatch.term = term;
        if (semester) sessionMatch.semester = semester;

        const report = await Attendance.aggregate([
            { $lookup: { from: 'attendancesessions', localField: 'sessionId', foreignField: '_id', as: 'session' } },
            { $unwind: "$session" },
            { $match: {
                "session.schoolId": sessionMatch.schoolId,
                ...(month && { "session.month": sessionMatch.month }),
                ...(weekNumber && { "session.weekNumber": sessionMatch.weekNumber }),
                ...(year && { "session.year": sessionMatch.year }),
                ...(term && { "session.term": sessionMatch.term }),
                ...(semester && { "session.semester": sessionMatch.semester })
            }},
            { $lookup: { from: 'scholars', localField: 'scholarId', foreignField: '_id', as: 'scholar' } },
            { $unwind: "$scholar" },
            { $match: { "scholar.status": "Active" } },
            { $group: {
                _id: "$scholarId",
                scholar_name: { $first: "$scholar.fullName" },
                age_id: { $first: "$scholar.scholarId" },
                present_count: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                total_sessions: { $sum: 1 }
            }},
            { $addFields: {
                target: "$total_sessions",
                attendanceRate: {
                    $cond: [
                        { $eq: ["$total_sessions", 0] },
                        0,
                        { $round: [{ $multiply: [{ $divide: ["$present_count", "$total_sessions"] }, 100] }, 0] }
                    ]
                }
            }},
            { $addFields: {
                status: {
                    $cond: [
                        { $gte: ["$attendanceRate", 85] },
                        "On Track",
                        {
                            $cond: [
                                { $gte: ["$attendanceRate", 50] },
                                "Behind",
                                "At Risk"
                            ]
                        }
                    ]
                }
            }},
            { $sort: { scholar_name: 1 } }
        ]);

        return successResponse(res, report);
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
