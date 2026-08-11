const Scholar = require('../models/Scholar');
const Sponsor = require('../models/Sponsor');
const School = require('../models/School');
const Event = require('../models/Event');
const AcademicResult = require('../models/AcademicResult');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Backup = require('../models/Backup');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { successResponse } = require('../utils/response');
const mongoose = require('mongoose');
const { applyDistrictFilter } = require('../utils/districtFilter');

const getDashboardStats = async (req, res, next) => {
    try {
        const { level = 'University', schoolId } = req.query;

        const baseFilter = applyDistrictFilter(req);

        // 1. Unified Summary Counts
        const levelFilter = { ...baseFilter, schoolType: level };

        const [totalInLevel, activeInLevel, graduatedInLevel, totalSponsors, totalUsers, totalSchools, backupCount] = await Promise.all([
            Scholar.countDocuments(levelFilter),
            Scholar.countDocuments({ ...levelFilter, status: 'Active' }),
            Scholar.countDocuments({ ...levelFilter, status: { $in: ['Graduated', 'Alumni'] } }),
            Sponsor.countDocuments(),
            User.countDocuments(),
            School.countDocuments({ ...baseFilter, level: level === 'University' ? { $regex: /tertiary|university|college/i } : { $regex: /secondary|high|primary/i } }),
            Backup.countDocuments()
        ]);

        // Calculate Retention specifically for the level
        const retentionStats = await Scholar.aggregate([
            { $match: levelFilter },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                retained: { $sum: { $cond: [{ $in: ["$status", ["Active", "Graduated"]] }, 1, 0] } }
            }}
        ]);

        const initialTotal = retentionStats[0]?.total || 0;
        const currentRetained = retentionStats[0]?.retained || 0;
        const retentionRate = initialTotal > 0 ? ((currentRetained / initialTotal) * 100).toFixed(1) : 100;

        // 3. Cohort Distribution (last 4 active cohorts)
        const cohortDistribution = await Scholar.aggregate([
            { $match: { ...levelFilter, status: 'Active', startYear: { $ne: null } } },
            { $group: { _id: "$startYear", count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 4 },
            { $project: { cohort: "$_id", count: 1, _id: 0 } }
        ]);

        // 4. Institutional Performance Trends
        const trendsMatch = { ...levelFilter, status: 'Active' };
        if (schoolId && mongoose.Types.ObjectId.isValid(schoolId)) {
            trendsMatch.schoolId = new mongoose.Types.ObjectId(schoolId);
        }

        const performanceTrends = await AcademicResult.aggregate([
            { $lookup: { from: 'scholars', localField: 'scholarId', foreignField: '_id', as: 'scholar' } },
            { $unwind: "$scholar" },
            { $match: {
                "scholar.schoolType": level,
                "scholar.status": "Active",
                ...(baseFilter.district ? { "scholar.district": baseFilter.district } : {})
            } },
            { $group: {
                _id: { year: "$year", school: "$scholar.schoolName" },
                avgMarks: { $avg: "$marks" }
            }},
            { $sort: { "_id.year": 1 } }
        ]);

        const performanceSeries = {};
        performanceTrends.forEach(t => {
            const name = t._id.school || 'Unassigned';
            if (!performanceSeries[name]) performanceSeries[name] = [];
            performanceSeries[name].push({ year: t._id.year, marks: t.avgMarks.toFixed(1) });
        });

        // 5. Pending Total & Summary
        const [pendingScholars, pendingEvents] = await Promise.all([
            Scholar.find({ ...levelFilter, status: 'Pending' }).limit(5),
            Event.find({ status: 'Pending' }).limit(5)
        ]);

        const approvalsSummary = [];
        const userRole = req.user?.role || '';
        const canApproveScholars = ['Administrator', 'Admin', 'Country Director', 'Program Coordinator', 'Program Manager'].includes(userRole);

        if (canApproveScholars) {
            pendingScholars.forEach(s => approvalsSummary.push({
                title: 'New Scholar Registration',
                desc: s.fullName,
                time: s.createdAt || s.created_at,
                type: 'scholar'
            }));
        }
        pendingEvents.forEach(e => approvalsSummary.push({
            title: 'New Event Proposal',
            desc: e.title,
            time: e.createdAt || e.created_at,
            type: 'event'
        }));

        // Sort approvals by time descending
        approvalsSummary.sort((a, b) => new Date(b.time) - new Date(a.time));

        const pScholarsCount = await Scholar.countDocuments({ ...levelFilter, status: 'Pending' });
        const pEventsCount = await Event.countDocuments({ status: 'Pending' });

        const riskStats = await Scholar.aggregate([
            { $match: { ...levelFilter, status: 'Active' } },
            { $lookup: {
                from: 'academicresults',
                localField: '_id',
                foreignField: 'scholarId',
                as: 'results'
            }},
            { $addFields: {
                avgMark: { $avg: "$results.marks" }
            }},
            { $group: {
                _id: "$schoolName",
                avg: { $avg: "$avgMark" },
                atrisk: { $sum: { $cond: [{ $lt: ["$avgMark", 50] }, 1, 0] } },
                total: { $sum: 1 },
                passed: { $sum: { $cond: [{ $gte: ["$avgMark", 50] }, 1, 0] } }
            }},
            { $project: {
                name: "$_id",
                avg: { $round: ["$avg", 1] },
                atrisk: 1,
                pass_rate: {
                    $round: [
                        { $multiply: [{ $divide: ["$passed", { $cond: [{ $eq: ["$total", 0] }, 1, "$total"] }] }, 100] },
                        1
                    ]
                },
                level: {
                    $cond: [
                        { $gte: ["$avg", 75] }, "low",
                        { $cond: [{ $gte: ["$avg", 55] }, "medium", "high"] }
                    ]
                }
            }},
            { $sort: { atrisk: -1 } }
        ]);

        const schoolsRisks = riskStats.map(r => ({
            ...r,
            reason: r.level === 'low'
                ? `Strong Institutional Integrity with ${r.pass_rate}% pass rate and consistent performance.`
                : (r.level === 'medium' ? `Moderate Risk: ${r.pass_rate}% pass rate. Flags on scholar marks.` : `High Alert: ${r.pass_rate}% pass rate. Multi-factor performance decline.`)
        }));

        // 6. Engagement vs Performance Impact (Active scholars only)
        const engagementTrends = await Attendance.aggregate([
            { $lookup: { from: 'scholars', localField: 'scholarId', foreignField: '_id', as: 'scholar' } },
            { $unwind: "$scholar" },
            { $match: {
                "scholar.status": "Active",
                "scholar.schoolType": level,
                ...(baseFilter.district ? { "scholar.district": baseFilter.district } : {})
            } },
            { $group: {
                _id: "$scholarId",
                presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                totalCount: { $sum: 1 }
            }},
            { $addFields: {
                rate: { $multiply: [{ $divide: ["$presentCount", { $cond: [{ $eq: ["$totalCount", 0] }, 1, "$totalCount"] }] }, 100] }
            }},
            { $addFields: {
                group: {
                    $cond: [
                        { $gte: ["$rate", 80] }, "Frequent",
                        { $cond: [{ $gte: ["$rate", 50] }, "Moderate", "Rare"] }
                    ]
                }
            }},
            { $lookup: { from: 'academicresults', localField: '_id', foreignField: 'scholarId', as: 'results' } },
            { $unwind: "$results" },
            { $group: {
                _id: { group: "$group", year: "$results.year" },
                avgScore: { $avg: "$results.marks" }
            }},
            { $sort: { "_id.year": 1 } }
        ]);

        const engagementSeries = {};
        engagementTrends.forEach(t => {
            if (!engagementSeries[t._id.group]) engagementSeries[t._id.group] = [];
            engagementSeries[t._id.group].push({ year: t._id.year, score: t.avgScore.toFixed(1) });
        });

        // 7. Regional Distribution (Active scholars only)
        const regions = await Scholar.aggregate([
            { $match: { ...levelFilter, status: 'Active', district: { $ne: null } } },
            { $group: { _id: "$district", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { region: "$_id", count: 1, _id: 0 } }
        ]);

        // 8. Operational Log (Recent System Activities)
        const logs = await Notification.find({
            $or: [
                { userId: req.user.id },
                { userId: null }
            ]
        })
        .sort({ created_at: -1 })
        .limit(10);

        const operationalLog = logs.map(l => ({
            id: l._id,
            title: l.type.toUpperCase(),
            message: l.message,
            time: l.created_at,
            actor: l.actorName,
            status: l.type
        }));

        const stats = {
            summary: [
                { label: `Total ${level}s`, value: totalInLevel, icon: 'groups' },
                { label: 'Active Scholars', value: activeInLevel, icon: 'check_circle' },
                { label: 'Graduated', value: graduatedInLevel, icon: 'award' },
                { label: 'Schools', value: totalSchools, icon: 'bank' },
                { label: 'Retention', value: `${retentionRate}%`, icon: 'trend', footnote: `${currentRetained} of ${initialTotal}` }
            ],
            system: {
                totalUsers,
                totalSchools,
                backupCount
            },
            cohorts: cohortDistribution,
            performanceSeries,
            engagementSeries,
            regions,
            operationalLog,
            pendingCount: (canApproveScholars ? pScholarsCount : 0) + pEventsCount,
            pendingScholarsCount: canApproveScholars ? pScholarsCount : 0,
            approvals: approvalsSummary,
            schools: schoolsRisks
        };

        return successResponse(res, stats);
    } catch (err) {
        next(err);
    }
};

const getDistrictsMapData = async (req, res, next) => {
    try {
        const districtCoords = {
            'Lilongwe': { lat: -13.9626, lng: 33.7741 },
            'Blantyre': { lat: -15.7667, lng: 35.0000 },
            'Zomba': { lat: -15.3833, lng: 35.3333 },
            'Mzimba': { lat: -11.9000, lng: 33.6000 },
            'Karonga': { lat: -9.9333, lng: 33.9333 },
            'Mangochi': { lat: -14.4833, lng: 35.2667 },
            'Dedza': { lat: -14.3333, lng: 34.3333 },
            'Kasungu': { lat: -13.0333, lng: 33.4833 },
            'Salima': { lat: -13.7833, lng: 34.4333 },
            'Nkhata Bay': { lat: -11.6061, lng: 34.2941 },
            'Chikwawa': { lat: -16.0333, lng: 34.8000 },
            'Mulanje': { lat: -16.0316, lng: 35.5076 },
            'Thyolo': { lat: -16.0667, lng: 35.1333 }
        };

        const data = await Scholar.aggregate([
            { $match: { status: 'Active', district: { $ne: null } } },
            { $group: { _id: "$district", count: { $sum: 1 } } }
        ]);

        const mapped = data.map(d => {
            const coords = districtCoords[d._id] || { lat: -13.2543, lng: 34.3015 }; // Default to center of Malawi
            return {
                district: d._id,
                scholarCount: d.count,
                latitude: coords.lat,
                longitude: coords.lng
            };
        });

        return successResponse(res, mapped);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardStats,
    getDistrictsMapData
};
