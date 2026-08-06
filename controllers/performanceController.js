const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * 1. Individual Scholar Trend & Intelligence
 */
const getScholarPerformance = async (req, res, next) => {
    try {
        const { scholarId } = req.params;
        const scholar = await Scholar.findById(scholarId);
        if (!scholar) return errorResponse(res, 'Scholar not found', 404);

        const results = await AcademicResult.find({ scholarId }).populate('subjectId');

        // Group by Year and Period
        const timeline = {};
        results.forEach(r => {
            const key = `${r.year}-${r.term || r.semester}`;
            if (!timeline[key]) timeline[key] = [];
            timeline[key].push({
                subject: r.subjectId.name,
                marks: r.marks,
                standing: r.gradeLetter
            });
        });

        const isSecondary = scholar.schoolType === 'Secondary';
        const threshold = isSecondary ? 40 : 50;

        const processedTimeline = Object.keys(timeline).sort().map(key => {
            const periodResults = timeline[key];
            const sortedResults = [...periodResults].sort((a, b) => b.marks - a.marks);

            // Secondary uses best 6, University uses all
            const relevantResults = isSecondary ? sortedResults.slice(0, 6) : sortedResults;
            const average = relevantResults.reduce((sum, r) => sum + r.marks, 0) / relevantResults.length;

            return {
                period: key,
                average: parseFloat(average.toFixed(1)),
                distanceToThreshold: parseFloat((average - threshold).toFixed(1)),
                best6: sortedResults.slice(0, 6),
                others: sortedResults.slice(6),
                resultCount: periodResults.length
            };
        });

        // Flag History from scholar record
        const flagHistory = scholar.progressionHistory || [];

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
            flagHistory
        });
    } catch (err) {
        next(err);
    }
};

/**
 * 2. Cohort & Class-Level Analytics
 */
const getCohortAnalytics = async (req, res, next) => {
    try {
        const { schoolType } = req.query; // 'Secondary' or 'University'
        const scholars = await Scholar.find({ schoolType, status: 'Active' });
        const results = await AcademicResult.find({ year: new Date().getFullYear() }).populate('scholarId');

        // Group by Academic Year (Form 1, Year 1 etc)
        const classGroups = {};

        scholars.forEach(s => {
            const label = s.academicYear || 'Unassigned';
            if (!classGroups[label]) {
                classGroups[label] = { total: 0, strongPass: 0, pass: 0, fail: 0, repeat: 0, supplementary: 0 };
            }
            classGroups[label].total++;
            if (s.flag === 'REPEAT') classGroups[label].repeat++;
            if (s.flag === 'SUPPLEMENTARY') classGroups[label].supplementary++;
        });

        // This is a simplified aggregate for demo - in prod, we'd iterate result averages
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
 * 3. Subject-Level Support Identification
 */
const getSubjectPerformance = async (req, res, next) => {
    try {
        const { schoolType } = req.query;
        const results = await AcademicResult.aggregate([
            { $lookup: { from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subject' } },
            { $unwind: '$subject' },
            { $match: { 'subject.level': schoolType } },
            { $group: {
                _id: '$subject.name',
                avgMark: { $avg: '$marks' },
                failCount: { $sum: { $cond: [{ $lt: ['$marks', schoolType === 'Secondary' ? 40 : 50] }, 1, 0] } },
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
 * 4. Early Warning & Risk Detection
 */
const getRiskIndicators = async (req, res, next) => {
    try {
        const currentYear = new Date().getFullYear();

        // Find scholars sitting near the threshold in the current year
        const results = await AcademicResult.aggregate([
            { $match: { year: currentYear } },
            { $group: {
                _id: '$scholarId',
                avg: { $avg: '$marks' },
                count: { $sum: 1 }
            }},
            { $lookup: { from: 'scholars', localField: '_id', foreignField: '_id', as: 'scholar' } },
            { $unwind: '$scholar' },
            { $project: {
                name: '$scholar.fullName',
                scholarId: '$scholar.scholarId',
                schoolType: '$scholar.schoolType',
                average: '$avg',
                flags: '$scholar.flag',
                distance: {
                    $subtract: [
                        '$avg',
                        { $cond: [{ $eq: ['$scholar.schoolType', 'Secondary'] }, 40, 50] }
                    ]
                }
            }},
            // Near threshold = between -5 and +2 from pass line
            { $match: { distance: { $gte: -10, $lte: 5 } } },
            { $sort: { distance: 1 } }
        ]);

        return successResponse(res, results);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getScholarPerformance,
    getCohortAnalytics,
    getSubjectPerformance,
    getRiskIndicators
};
