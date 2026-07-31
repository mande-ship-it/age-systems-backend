const AcademicResult = require('../models/AcademicResult');
const Subject = require('../models/Subject');
const Scholar = require('../models/Scholar');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Replicating frontend grading logic for consistency
 */
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
        // Secondary School (MSCE style)
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

/**
 * Record or update results (supports bulk)
 */
const recordResults = async (req, res, next) => {
    try {
        const { scholarId, results, year, term, semester, schoolType } = req.body;
        const isUniversity = schoolType === 'University';

        const scholar = await Scholar.findById(scholarId);
        const savedResults = [];

        for (const resEntry of results) {
            let subject = await Subject.findByNameAndLevel(resEntry.subjectName, schoolType);

            // Auto-register subject if it doesn't exist (matching frontend behavior)
            if (!subject) {
                const baseCode = resEntry.subjectName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'SUBJ';
                let counter = 101;
                let autoCode = `${baseCode}${counter}`;
                
                // Keep incrementing until we find a unique code to avoid 500 error
                while (await Subject.findByCode(autoCode)) {
                    counter++;
                    autoCode = `${baseCode}${counter}`;
                }

                subject = await Subject.create({
                    name: resEntry.subjectName,
                    code: autoCode,
                    level: schoolType,
                    details: 'Auto-registered during results entry.'
                });
            }

            const graded = calculateGrade(resEntry.marks, isUniversity);

            const record = await AcademicResult.upsert({
                scholarId: scholarId || resEntry.scholarId,
                subjectId: subject.id,
                marks: resEntry.marks,
                gradeLetter: graded.letter,
                gradePoint: graded.point,
                year,
                term: !isUniversity ? term : null,
                semester: isUniversity ? semester : null
            });

            savedResults.push(record);
        }

        if (scholar) {
            const period = isUniversity ? semester : term;
            await NotificationService.notifyAll(`🎓 Academic results entered for ${scholar.full_name} (${year}, ${period})`, 'success', req.user ? req.user.fullName : 'System');

            // Trigger progression evaluation
            await Scholar.evaluateProgression(scholar.id, year);
        }

        return successResponse(res, savedResults, `Successfully saved ${savedResults.length} result(s).`, 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Get results for a specific scholar
 */
const getScholarResults = async (req, res, next) => {
    try {
        const scholarId = req.params.scholarId || req.query.scholarId;
        const { year } = req.query;

        let results;
        if (scholarId && scholarId !== '') {
            results = await AcademicResult.getByScholar(scholarId, year);
        } else {
            // Fetch all results if no scholarId is provided
            const pool = require('../config/database');
            const sql = `
                SELECT r.*, s.name as subject_name, s.code as subject_code
                FROM academic_results r
                JOIN subjects s ON r.subject_id = s.id
                ORDER BY r.year DESC, r.term ASC, r.semester ASC
            `;
            const result = await pool.query(sql);
            results = result.rows;
        }

        const mappedResults = results.map(r => ({
            ...r,
            scholar_id: r.scholar_id.toString(), // Ensure string for frontend matching
            academic_year: r.year.toString(),    // Ensure string for frontend filtering
            year: r.year.toString(),             // Provide both for compatibility
            marks: parseFloat(r.marks) || 0,
            gpa: r.semester ? (parseFloat(r.grade_point) || 0) : null,
            points: r.term ? (parseFloat(r.grade_point) || 0) : null,
            subject_name: r.subject_name,
            subject_code: r.subject_code
        }));

        return successResponse(res, mappedResults, 'Scholar results retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

const getSchoolResults = async (req, res, next) => {
    try {
        const { schoolId, schoolName, year, term, semester } = req.query;
        if (!schoolId && !schoolName) {
            return errorResponse(res, 'School ID or School Name is required.', 400);
        }

        const results = await AcademicResult.getBySchool(schoolId || schoolName, year, term, semester);
        
        const mappedResults = results.map(r => ({
            ...r,
            academic_year: r.year,
            gpa: r.semester ? parseFloat(r.grade_point) : null,
            points: r.term ? parseFloat(r.grade_point) : null,
            scholar_id: r.scholar_id,
            scholar_name: r.scholar_name,
            subject: r.subject_name,
            marks: r.marks,
            grade: r.grade_letter
        }));

        return successResponse(res, mappedResults, 'School results retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get analysis stats for a specific year
 */
const getYearlyStats = async (req, res, next) => {
    try {
        const { year } = req.params;
        const results = await AcademicResult.getStatsByYear(year);
        return successResponse(res, results, `Academic statistics for ${year} retrieved.`);
    } catch (err) {
        next(err);
    }
};

/**
 * Subject Registry Management
 */
const getSubjectRegistry = async (req, res, next) => {
    try {
        const { level } = req.query;
        const subjects = await Subject.getAll(level);
        return successResponse(res, subjects, 'Subject registry retrieved.');
    } catch (err) {
        next(err);
    }
};

const createSubject = async (req, res, next) => {
    try {
        const { code } = req.body;

        // Manual check to provide a nice error instead of 500
        const existing = await Subject.findByCode(code);
        if (existing) {
            return errorResponse(res, `Subject code "${code}" already exists. Please provide a unique code.`, 400);
        }

        const subject = await Subject.create(req.body);

        await NotificationService.notifyAll(`📚 New subject registered: ${subject.name} (${subject.code})`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, subject, 'Subject registered successfully.', 201);
    } catch (err) {
        next(err);
    }
};

const deleteSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const subject = await Subject.findById(id);
        const deleted = await Subject.delete(id);
        if (!deleted) return errorResponse(res, 'Subject not found.', 404);

        if (subject) {
            await NotificationService.notifyAll(`🗑️ Subject removed from registry: ${subject.name} (${subject.code})`, 'warning', req.user ? req.user.fullName : 'System');
        }

        return successResponse(res, { id }, 'Subject removed from registry.');
    } catch (err) {
        next(err);
    }
};

const checkResultCompleteness = async (req, res, next) => {
    try {
        const { scholarId, year } = req.params;
        const results = await AcademicResult.getByScholar(scholarId, year);
        const scholar = await Scholar.findById(scholarId);

        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);

        const terms = [...new Set(results.map(r => r.term).filter(Boolean))];
        const semesters = [...new Set(results.map(r => r.semester).filter(Boolean))];

        const isComplete = (scholar.school_type === 'Secondary' && terms.length === 3) ||
                           (scholar.school_type === 'University' && semesters.length === 2);

        return successResponse(res, {
            isComplete,
            termsRecorded: terms,
            semestersRecorded: semesters,
            requiredTerms: scholar.school_type === 'Secondary' ? 3 : 0,
            requiredSemesters: scholar.school_type === 'University' ? 2 : 0
        }, 'Result completeness check completed.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    recordResults,
    getScholarResults,
    getSchoolResults,
    getYearlyStats,
    getSubjectRegistry,
    createSubject,
    deleteSubject,
    checkResultCompleteness
};
