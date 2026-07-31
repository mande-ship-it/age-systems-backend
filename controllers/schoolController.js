const School = require('../models/School');
const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * School Management
 */
const createSchool = async (req, res, next) => {
    try {
        const { code, name } = req.body;

        if (code) {
            const existingSchool = await School.findByCode(code);
            if (existingSchool) {
                // If school exists, update it or just return it
                const updated = await School.update(existingSchool.id, req.body);
                await NotificationService.notifyAll(`🏫 School updated: ${name || code}`, 'info', req.user ? req.user.fullName : 'System');
                return successResponse(res, updated, 'School updated (already existed).', 201);
            }
        }

        const school = await School.create(req.body);
        await NotificationService.notifyAll(`🏫 New school registered: ${name || code}`, 'success', req.user ? req.user.fullName : 'System');
        return successResponse(res, school, 'School created successfully.', 201);
    } catch (err) {
        next(err);
    }
};

const getAllSchools = async (req, res, next) => {
    try {
        const schools = await School.getAll();
        return successResponse(res, schools, 'Schools list retrieved.');
    } catch (err) {
        next(err);
    }
};

const getSchoolById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const school = await School.findById(id);
        if (!school) {
            return errorResponse(res, 'School not found.', 404);
        }

        const stats = await School.getStats(id);
        const schoolWithStats = { ...school, stats };

        return successResponse(res, schoolWithStats, 'School details retrieved.');
    } catch (err) {
        next(err);
    }
};

const updateSchool = async (req, res, next) => {
    try {
        const { id } = req.params;
        const school = await School.findById(id);
        if (!school) {
            return errorResponse(res, 'School not found.', 404);
        }

        const updated = await School.update(id, req.body);
        await NotificationService.notifyAll(`🏫 School updated: ${updated.name || updated.code}`, 'info', req.user ? req.user.fullName : 'System');
        return successResponse(res, updated, 'School updated successfully.');
    } catch (err) {
        next(err);
    }
};

const deleteSchool = async (req, res, next) => {
    try {
        const { id } = req.params;
        const school = await School.findById(id);
        if (!school) {
            return errorResponse(res, 'School not found.', 404);
        }
        await School.delete(id);
        await NotificationService.notifyAll(`🗑️ School deleted: ${school.name || school.code}`, 'warning', req.user ? req.user.fullName : 'System');
        return successResponse(res, { id }, 'School deleted successfully.');
    } catch (err) {
        next(err);
    }
};

const toggleSchoolStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await School.toggleStatus(id);
        if (!updated) {
            return errorResponse(res, 'School not found.', 404);
        }
        return successResponse(res, updated, `School status changed to ${updated.status}.`);
    } catch (err) {
        next(err);
    }
};

/**
 * Scholar Progression / Promotion Logic
 */

/**
 * Get scholars by school for promotion review
 * This matches the logic in PromoteScholarsComponent
 */
const getScholarsForPromotion = async (req, res, next) => {
    try {
        const { schoolId, schoolName, year } = req.query;

        // Fetch scholars belonging to this school
        const scholars = await Scholar.getBySchool(schoolId, schoolName);

        // For each scholar, calculate their average for the selected year to see if they "Passed"
        const scholarsWithStatus = await Promise.all(scholars.map(async (scholar) => {
            const results = await AcademicResult.getByScholar(scholar.id, year);

            let average = 0;
            let passed = false;

            if (results.length > 0) {
                const totalMarks = results.reduce((sum, r) => sum + parseFloat(r.marks), 0);
                average = totalMarks / results.length;
                passed = average >= 50; // Pass mark defined in frontend
            }

            return {
                ...scholar,
                average_marks: average.toFixed(1),
                passed: passed,
                can_promote: passed
            };
        }));

        return successResponse(res, scholarsWithStatus, 'Scholars progression data retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * Promote a single scholar
 * Implements the nextClass logic from the frontend
 */
const promoteScholar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scholar = await Scholar.findById(id);

        if (!scholar) {
            return errorResponse(res, 'Scholar not found.', 404);
        }

        const currentClass = scholar.academic_year;
        let nextClass = currentClass;

        // Logic from Flutter PromoteScholarsComponent
        if (scholar.school_type === 'Secondary') {
            if (currentClass.startsWith('Form ')) {
                const formNum = parseInt(currentClass.replace('Form ', ''));
                if (!isNaN(formNum)) {
                    nextClass = `Form ${formNum + 1}`;
                }
            } else {
                nextClass = 'Form 1';
            }
        } else if (scholar.school_type === 'University') {
            if (currentClass.startsWith('Year ')) {
                const yearNum = parseInt(currentClass.replace('Year ', ''));
                if (!isNaN(yearNum)) {
                    nextClass = `Year ${yearNum + 1}`;
                }
            } else {
                nextClass = 'Year 1';
            }
        }

        const updated = await Scholar.promote(id, nextClass);

        await NotificationService.notifyAll(`📈 Scholar promoted: ${scholar.full_name} moved to ${nextClass}`, 'success', req.user ? req.user.fullName : 'System');

        return successResponse(res, {
            scholar_id: id,
            previous_class: currentClass,
            new_class: nextClass
        }, `Scholar ${scholar.full_name} promoted successfully.`);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createSchool,
    getAllSchools,
    getSchoolById,
    updateSchool,
    deleteSchool,
    toggleSchoolStatus,
    getScholarsForPromotion,
    promoteScholar
};
