const AcademicResult = require('../models/AcademicResult');
const Subject = require('../models/Subject');
const Scholar = require('../models/Scholar');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

const { applyDistrictFilter } = require('../utils/districtFilter');
const { evaluateProgression } = require('../utils/progressionEngine');

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

        const scholar = await Scholar.findById(scholarId);
        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);

        const isUniversity = (schoolType || scholar.schoolType) === 'University';

        const savedResults = [];

        for (const resEntry of results) {
            let subject = await Subject.findOne({ name: new RegExp(`^${resEntry.subjectName}$`, 'i'), level: (schoolType || scholar.schoolType) });

            if (!subject) {
                const autoCode = `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
                subject = await Subject.create({
                    name: resEntry.subjectName,
                    code: autoCode,
                    level: (schoolType || scholar.schoolType)
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

        // Trigger progression evaluation (Spec Section 3)
        await evaluateProgression(scholarId, year);

        await NotificationService.notifyAll(`🎓 Academic results entered for ${scholar.fullName} (${year})`, 'success', req.user ? req.user.fullName : 'System');

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
                scholar_id: r.scholarId.toString()
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

        if (schoolId && schoolId !== 'null' && schoolId !== 'undefined' && schoolId !== '') {
            const scholarIds = await Scholar.find({ schoolId }).distinct('_id');
            filter.scholarId = { $in: scholarIds };
        }

        if (year && year !== 'null' && year !== 'undefined' && year !== '') filter.year = parseInt(year);

        const results = await AcademicResult.find(filter)
            .populate('scholarId subjectId')
            .sort({ year: -1 });

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

const checkResultCompleteness = async (req, res, next) => {
    try {
        const { scholarId, year } = req.params;
        const results = await AcademicResult.find({ scholarId, year: parseInt(year) });

        const termsRecorded = [...new Set(results.map(r => r.term).filter(Boolean))];
        const semestersRecorded = [...new Set(results.map(r => r.semester).filter(Boolean))];

        const scholar = await Scholar.findById(scholarId);
        const isUniversity = scholar && scholar.schoolType === 'University';

        const isComplete = isUniversity ? semestersRecorded.length === 2 : termsRecorded.length === 3;

        return successResponse(res, {
            isComplete,
            termsRecorded,
            semestersRecorded
        });
    } catch (err) {
        next(err);
    }
};

const getYearlyStats = async (req, res, next) => {
    try {
        const { year } = req.params;
        // Basic implementation for stats
        const results = await AcademicResult.find({ year: parseInt(year) });
        const avg = results.length > 0 ? results.reduce((sum, r) => sum + r.marks, 0) / results.length : 0;

        return successResponse(res, { year, averageMark: avg, totalRecords: results.length });
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

const getSchoolsWithResults = async (req, res, next) => {
    try {
        const scholarIds = await AcademicResult.distinct('scholarId');
        const scholars = await Scholar.find({ _id: { $in: scholarIds } }).distinct('schoolId');
        const School = require('../models/School');
        const schools = await School.find({ _id: { $in: scholars } }).sort({ name: 1 });
        return successResponse(res, schools);
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
    checkResultCompleteness,
    getYearlyStats,
    deleteSubject,
    getSchoolsWithResults
};
