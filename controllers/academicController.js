const AcademicResult = require('../models/AcademicResult');
const Subject = require('../models/Subject');
const Scholar = require('../models/Scholar');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

const calculateGrade = (marks, isUniversity) => {
    if (isUniversity) {
        if (marks >= 75) return { letter: 'A', point: 4.00 };
        if (marks >= 70) return { letter: 'B+', point: 3.50 };
        if (marks >= 65) return { letter: 'B', point: 3.00 };
        if (marks >= 60) return { letter: 'C+', point: 2.50 };
        if (marks >= 55) return { letter: 'C', point: 2.00 };
        if (marks >= 50) return { letter: 'D', point: 1.00 };
        return { letter: 'F', point: 0.00 };
    } else {
        if (marks >= 80) return { letter: 'Distinction', point: 1.0 };
        if (marks >= 75) return { letter: 'Distinction', point: 2.0 };
        if (marks >= 70) return { letter: 'Credit', point: 3.0 };
        if (marks >= 65) return { letter: 'Credit', point: 4.0 };
        if (marks >= 60) return { letter: 'Credit', point: 5.0 };
        if (marks >= 55) return { letter: 'Credit', point: 6.0 };
        if (marks >= 50) return { letter: 'Pass', point: 7.0 };
        if (marks >= 45) return { letter: 'Pass', point: 8.0 };
        return { letter: 'Fail', point: 9.0 };
    }
};

const recordResults = async (req, res, next) => {
    try {
        const { scholarId, results, year, term, semester, schoolType } = req.body;

        // Ensure scholar is active
        const scholar = await Scholar.findById(scholarId);
        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);
        if (scholar.status !== 'Active') {
            return errorResponse(res, `Cannot record results for ${scholar.status} scholars. Only Active scholars are permitted.`, 403);
        }

        const isUniversity = schoolType === 'University';

        const savedResults = [];

        for (const resEntry of results) {
            let subject = await Subject.findOne({ name: new RegExp(`^${resEntry.subjectName}$`, 'i'), level: schoolType });

            if (!subject) {
                const autoCode = `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
                subject = await Subject.create({
                    name: resEntry.subjectName,
                    code: autoCode,
                    level: schoolType
                });
            }

            const graded = calculateGrade(resEntry.marks, isUniversity);

            const filter = { scholarId, subjectId: subject._id, year };
            if (isUniversity) filter.semester = semester; else filter.term = term;

            const update = {
                marks: resEntry.marks,
                gradeLetter: graded.letter,
                gradePoint: graded.point
            };

            const record = await AcademicResult.findOneAndUpdate(filter, update, { upsert: true, new: true });
            savedResults.push(record);
        }

        await NotificationService.notifyAll(`🎓 Academic results entered (${year})`, 'success');

        return successResponse(res, savedResults, `Successfully saved ${savedResults.length} result(s).`, 201);
    } catch (err) {
        next(err);
    }
};

const getScholarResults = async (req, res, next) => {
    try {
        let scholarId = req.params.scholarId || req.query.scholarId;
        const { year } = req.query;

        if (!scholarId) {
            return errorResponse(res, 'Scholar ID is required.', 400);
        }

        // If it's not a valid ObjectId, try finding the scholar by their string ID (e.g., AGE-001)
        if (!mongoose.Types.ObjectId.isValid(scholarId)) {
            const scholar = await Scholar.findOne({ scholarId: scholarId });
            if (!scholar) return errorResponse(res, 'Scholar not found.', 404);
            scholarId = scholar._id;
        }

        const results = await AcademicResult.find({ scholarId, ...(year && { year }) })
            .populate('subjectId')
            .sort({ year: -1, term: 1, semester: 1 });

        const mappedResults = results.map(r => {
            const resultObj = r.toObject();
            return {
                ...resultObj,
                marks: parseFloat(r.marks),
                gpa: r.semester ? r.gradePoint : null,
                points: r.term ? r.gradePoint : null,
                subject_name: r.subjectId ? r.subjectId.name : 'N/A',
                subject_code: r.subjectId ? r.subjectId.code : 'N/A',
                scholar_id: r.scholarId ? (r.scholarId._id ? r.scholarId._id.toString() : r.scholarId.toString()) : 'N/A'
            };
        });

        return successResponse(res, mappedResults);
    } catch (err) {
        next(err);
    }
};

const getSubjectRegistry = async (req, res, next) => {
    try {
        const { level } = req.query;
        const subjects = await Subject.find(level ? { level } : {}).sort({ name: 1 });
        return successResponse(res, subjects);
    } catch (err) {
        next(err);
    }
};

const createSubject = async (req, res, next) => {
    try {
        const subject = new Subject(req.body);
        await subject.save();
        return successResponse(res, subject, 'Subject registered.', 201);
    } catch (err) {
        next(err);
    }
};

const getSchoolResults = async (req, res, next) => {
    try {
        const { schoolId, year } = req.query;
        const filter = {};
        if (schoolId) {
            if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                return errorResponse(res, 'Invalid School ID.', 400);
            }
            const scholars = await Scholar.find({ schoolId }).select('_id');
            filter.scholarId = { $in: scholars.map(s => s._id) };
        }
        if (year) filter.year = parseInt(year);

        const results = await AcademicResult.find(filter)
            .populate('scholarId subjectId')
            .sort({ year: -1 });

        const mappedResults = results.map(r => ({
            ...r.toObject(),
            marks: parseFloat(r.marks),
            gpa: r.semester ? r.gradePoint : null,
            points: r.term ? r.gradePoint : null,
            subject_name: r.subjectId ? r.subjectId.name : 'N/A',
            subject_code: r.subjectId ? r.subjectId.code : 'N/A',
            scholar_id: r.scholarId ? (r.scholarId._id ? r.scholarId._id.toString() : r.scholarId.toString()) : 'N/A'
        }));

        return successResponse(res, mappedResults);
    } catch (err) {
        next(err);
    }
};

const getYearlyStats = async (req, res, next) => {
    try {
        const { year } = req.params;
        const stats = await AcademicResult.aggregate([
            { $match: { year: parseInt(year) } },
            { $group: {
                _id: "$scholarId",
                avgMark: { $avg: "$marks" },
                count: { $sum: 1 }
            }},
            { $lookup: {
                from: 'scholars',
                localField: '_id',
                foreignField: '_id',
                as: 'scholar'
            }},
            { $unwind: '$scholar' }
        ]);
        return successResponse(res, stats);
    } catch (err) {
        next(err);
    }
};

const deleteSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        await Subject.findByIdAndDelete(id);
        return successResponse(res, null, 'Subject deleted.');
    } catch (err) {
        next(err);
    }
};

const checkResultCompleteness = async (req, res, next) => {
    try {
        let { scholarId, year } = req.params;

        if (!scholarId) return errorResponse(res, 'Scholar ID is required.', 400);

        if (!mongoose.Types.ObjectId.isValid(scholarId)) {
            const scholar = await Scholar.findOne({ scholarId });
            if (!scholar) return errorResponse(res, 'Scholar not found.', 404);
            scholarId = scholar._id;
        }

        const count = await AcademicResult.countDocuments({ scholarId, year });
        return successResponse(res, { count, isComplete: count >= 6 });
    } catch (err) {
        next(err);
    }
};

const getSchoolsWithResults = async (req, res, next) => {
    try {
        const scholarIdsWithResults = await AcademicResult.distinct('scholarId');
        const scholars = await Scholar.find({ _id: { $in: scholarIdsWithResults } })
            .populate('schoolId')
            .select('schoolId schoolName');

        const schoolNames = new Set();
        scholars.forEach(s => {
            if (s.schoolId && s.schoolId.name) schoolNames.add(s.schoolId.name);
            else if (s.schoolName) schoolNames.add(s.schoolName);
        });

        return successResponse(res, Array.from(schoolNames).sort().map(name => ({ name })));
    } catch (err) {
        next(err);
    }
};

module.exports = {
    recordResults,
    getScholarResults,
    getSubjectRegistry,
    createSubject,
    getSchoolResults,
    getYearlyStats,
    deleteSubject,
    checkResultCompleteness,
    getSchoolsWithResults
};
