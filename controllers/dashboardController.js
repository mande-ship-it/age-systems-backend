const Scholar = require('../models/Scholar');
const Sponsor = require('../models/Sponsor');
const School = require('../models/School');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const AcademicResult = require('../models/AcademicResult');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Backup = require('../models/Backup');
const { successResponse } = require('../utils/response');
const mongoose = require('mongoose');

const getDashboardStats = async (req, res, next) => {
    try {
        const { level = 'University', schoolId } = req.query;

        // 1. Unified Summary Counts
        const [totalScholars, activeScholars, graduatedScholars, uniActive, secActive, totalSponsors, totalUsers, totalSchools, backupCount] = await Promise.all([
            Scholar.countDocuments(),
            Scholar.countDocuments({ status: 'Active' }),
            Scholar.countDocuments({ status: { $in: ['Graduated', 'Alumni'] } }),
            Scholar.countDocuments({ status: 'Active', schoolType: 'University' }),
            Scholar.countDocuments({ status: 'Active', schoolType: 'Secondary' }),
            Sponsor.countDocuments(),
            User.countDocuments(),
            School.countDocuments(),
            Backup.countDocuments()
        ]);

        // 2. Retention Analytics
        const retentionFilter = { schoolType: level };
        if (schoolId) retentionFilter.schoolId = mongoose.Types.ObjectId(schoolId);

        const retentionStats = await Scholar.aggregate([
            { $match: retentionFilter },
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
            { $match: { schoolType: level, status: 'Active', startYear: { $ne: null } } },
            { $group: { _id: "$startYear", count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 4 },
            { $project: { cohort: "$_id", count: 1, _id: 0 } }
        ]);

        // 4. Institutional Performance Trends
        const trendsMatch = { schoolType: level, status: 'Active' };
        if (schoolId) trendsMatch.schoolId = mongoose.Types.ObjectId(schoolId);

        const performanceTrends = await AcademicResult.aggregate([
            { $lookup: { from: 'scholars', localField: 'scholarId', foreignField: '_id', as: 'scholar' } },
            { $unwind: "$scholar" },
            { $match: { "scholar.schoolType": level, "scholar.status": "Active" } },
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
        const [pendingScholars, pendingEvents, pendingPayments] = await Promise.all([
            Scholar.find({ status: 'Pending' }).limit(5),
            Event.find({ status: 'Pending' }).limit(5),
            Payment.find({ status: 'Pending' }).limit(5)
        ]);

        const approvalsSummary = [];
        const userRole = req.user?.role || '';
        const canApproveScholars = ['Administrator', 'Admin', 'Country Director', 'Program Coordinator', 'Program Manager'].includes(userRole);

        if (canApproveScholars) {
            pendingScholars.forEach(s => approvalsSummary.push({ title: 'New Scholar Registration', desc: s.fullName, time: 'Action Required', type: 'scholar' }));
        }
        pendingEvents.forEach(e => approvalsSummary.push({ title: 'New Event Proposal', desc: e.title, time: 'Action Required', type: 'event' }));

        const pScholarsCount = await Scholar.countDocuments({ status: 'Pending' });
        const pEventsCount = await Event.countDocuments({ status: 'Pending' });
        const pPaymentsCount = await Payment.countDocuments({ status: 'Pending' });

        const riskStats = await Scholar.aggregate([
            { $match: { schoolType: level, status: 'Active' } },
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
            { $match: { "scholar.status": "Active", "scholar.schoolType": level } },
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

        const stats = {
            summary: [
                { label: 'Active Scholars', value: activeScholars, icon: 'groups' },
                { label: 'Graduated', value: graduatedScholars, icon: 'award' },
                { label: 'University', value: uniActive, icon: 'bank' },
                { label: 'Secondary', value: secActive, icon: 'book' },
                { label: 'Sponsors', value: totalSponsors, icon: 'heart' },
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
            pendingCount: (canApproveScholars ? pScholarsCount : 0) + pEventsCount + pPaymentsCount,
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
