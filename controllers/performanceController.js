const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');
const { applyDistrictFilter } = require('../utils/districtFilter');

/**
 * 1. Individual Scholar Trend & Intelligence
 */
const getScholarPerformance = async (req, res, next) => {
    try {
        const { scholarId } = req.params;
        const query = applyDistrictFilter(req, { _id: new mongoose.Types.ObjectId(scholarId) });
        const scholar = await Scholar.findOne(query);

        if (!scholar) return errorResponse(res, 'Scholar not found or access denied.', 404);

        const results = await AcademicResult.find({ scholarId: scholar._id }).populate('subjectId');

        const timeline = {};
        results.forEach(r => {
            const key = `${r.year}-${r.term || r.semester}`;
            if (!timeline[key]) timeline[key] = [];
            timeline[key].push({
                subject: r.subjectId ? r.subjectId.name : 'N/A',
                marks: r.marks
            });
        });

        const isSecondary = scholar.schoolType === 'Secondary';
        const processedTimeline = Object.keys(timeline).sort().map(key => {
            const sortedResults = [...timeline[key]].sort((a, b) => b.marks - a.marks);
            const relevant = isSecondary ? sortedResults.slice(0, 6) : sortedResults.slice(0, 5);
            const average = relevant.reduce((sum, r) => sum + r.marks, 0) / (relevant.length || 1);

            return {
                period: key,
                average: parseFloat(average.toFixed(1)),
                best6: relevant
            };
        });

        return successResponse(res, {
            scholarInfo: {
                fullName: scholar.fullName,
                schoolType: scholar.schoolType,
                currentRelativeYear: scholar.yearsCompleted + 1,
                programDurationYears: scholar.programDurationYears,
                yearsRemaining: scholar.yearsRemaining,
                academicFlag: scholar.flag
            },
            timeline: processedTimeline,
            flagHistory: scholar.progressionHistory || []
        });
    } catch (err) {
        next(err);
    }
};

/**
 * 2. Cohort Analytics
 */
const getCohortAnalytics = async (req, res, next) => {
    try {
        const { schoolType, district, schoolId } = req.query;
        const scholarQuery = applyDistrictFilter(req, {
            schoolType: new RegExp(schoolType, 'i'),
            status: 'Active',
            ...(district && { district: new RegExp(district, 'i') }),
            ...(schoolId && { schoolId: new mongoose.Types.ObjectId(schoolId) })
        });

        const scholars = await Scholar.find(scholarQuery);
        const classGroups = {};

        scholars.forEach(s => {
            const label = s.academicYear || 'Unassigned';
            if (!classGroups[label]) {
                classGroups[label] = { total: 0, repeat: 0, supplementary: 0 };
            }
            classGroups[label].total++;
            if (s.flag === 'REPEAT') classGroups[label].repeat++;
            if (s.flag === 'SUPPLEMENTARY') classGroups[label].supplementary++;
        });

        return successResponse(res, {
            classGroups,
            summary: {
                totalScholars: scholars.length,
                onTrack: scholars.filter(s => !s.flag).length,
                atRisk: scholars.filter(s => s.flag).length
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * 3. Subject Performance
 */
const getSubjectPerformance = async (req, res, next) => {
    try {
        const { schoolType, district, schoolId } = req.query;
        const scholarQuery = applyDistrictFilter(req, {
            schoolType: new RegExp(schoolType, 'i'),
            status: 'Active',
            ...(district && { district: new RegExp(district, 'i') }),
            ...(schoolId && { schoolId: new mongoose.Types.ObjectId(schoolId) })
        });

        const scholars = await Scholar.find(scholarQuery);
        const scholarIds = scholars.map(s => s._id);

        const results = await AcademicResult.aggregate([
            { $match: { scholarId: { $in: scholarIds } } },
            { $lookup: { from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subject' } },
            { $unwind: '$subject' },
            { $group: {
                _id: '$subject.name',
                avgMark: { $avg: '$marks' },
                failCount: { $sum: { $cond: [{ $lt: ['$marks', 50] }, 1, 0] } },
                totalCount: { $sum: 1 }
            }},
            { $sort: { avgMark: 1 } }
        ]);

        return successResponse(res, results);
    } catch (err) {
        next(err);
    }
};

/**
 * 4. Risk Indicators
 */
const getRiskIndicators = async (req, res, next) => {
    try {
        const { schoolType, district, schoolId } = req.query;
        const scholarQuery = applyDistrictFilter(req, {
            status: 'Active',
            schoolType: new RegExp(schoolType || 'Secondary', 'i'),
            ...(district && { district: new RegExp(district, 'i') }),
            ...(schoolId && { schoolId: new mongoose.Types.ObjectId(schoolId) })
        });

        const scholars = await Scholar.find(scholarQuery);
        const scholarIds = scholars.map(s => s._id);

        console.log(`[Risk Analytics] Found ${scholarIds.length} scholars in query. District: ${district || 'All'}`);

        const results = await AcademicResult.aggregate([
            { $match: { scholarId: { $in: scholarIds } } },
            { $group: {
                _id: '$scholarId',
                avg: { $avg: '$marks' }
            }},
            { $lookup: { from: 'scholars', localField: '_id', foreignField: '_id', as: 'scholar' } },
            { $unwind: '$scholar' },
            { $project: {
                name: '$scholar.fullName',
                scholarId: '$scholar.scholarId',
                average: { $round: ['$avg', 1] },
                distance: { $subtract: ['$avg', 50] }
            }},
            { $match: { distance: { $lte: 5 } } },
            { $sort: { distance: 1 } }
        ]);

        console.log(`[Risk Analytics] Returning ${results.length} scholars at risk.`);
        return successResponse(res, results);
    } catch (err) {
        next(err);
    }
};

/**
 * 5. Engagement Impact
 */
const getEngagementImpact = async (req, res, next) => {
    try {
        const { schoolType, district, schoolId } = req.query;
        const baseFilter = applyDistrictFilter(req, {
            schoolType: new RegExp(schoolType || 'Secondary', 'i'),
            ...(district && { district: new RegExp(district, 'i') }),
            ...(schoolId && { schoolId: new mongoose.Types.ObjectId(schoolId) })
        });

        const isFieldOfficer = (req.user?.role || '').toLowerCase().includes('field');

        const engagementTrends = await Scholar.aggregate([
            { $match: {
                ...baseFilter,
                status: isFieldOfficer ? { $in: ['Active', 'Pending'] } : 'Active'
            } },
            { $lookup: { from: 'attendances', localField: '_id', foreignField: 'scholarId', as: 'att' } },
            { $addFields: {
                rate: {
                    $cond: [
                        { $eq: [{ $size: "$att" }, 0] },
                        0,
                        { $multiply: [{ $divide: [{ $size: { $filter: { input: "$att", as: "a", cond: { $eq: ["$$a.status", "present"] } } } }, { $size: "$att" }] }, 100] }
                    ]
                }
            }},
            { $addFields: {
                group: {
                    $cond: [
                        { $gte: ["$rate", 80] }, "Frequent",
                        { $cond: [{ $gte: ["$rate", 50] }, "Moderate", "Rare"] }
                    ]
                }
            }},
            { $lookup: { from: 'academicresults', localField: '_id', foreignField: 'scholarId', as: 'res' } },
            { $unwind: { path: "$res", preserveNullAndEmptyArrays: true } },
            { $group: {
                _id: { group: "$group", year: { $ifNull: ["$res.year", "2026"] } },
                avgScore: { $avg: { $ifNull: ["$res.marks", 0] } },
                count: { $addToSet: "$_id" }
            }},
            { $project: {
                group: "$_id.group",
                year: "$_id.year",
                score: { $round: ["$avgScore", 1] },
                scholarCount: { $size: "$count" },
                _id: 0
            }},
            { $sort: { "year": 1 } }
        ]);

        const series = {};
        engagementTrends.forEach(t => {
            if (!series[t.group]) series[t.group] = [];
            series[t.group].push({ year: t.year, score: t.score, count: t.scholarCount });
        });

        return successResponse(res, series);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getScholarPerformance,
    getCohortAnalytics,
    getSubjectPerformance,
    getRiskIndicators,
    getEngagementImpact
};
