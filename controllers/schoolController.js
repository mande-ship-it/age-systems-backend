const mongoose = require('mongoose');
const School = require('../models/School');
const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');
const { applyDistrictFilter } = require('../utils/districtFilter');

/**
 * School Management
 */
const createSchool = async (req, res, next) => {
    try {
        const { code, name, postal } = req.body;

        const schoolData = { ...req.body };

        // Security: Field Officers can only register schools for their own district
        if (req.user && req.user.role && req.user.role.toLowerCase().includes('field') && req.user.assignedDistrict) {
            schoolData.district = req.user.assignedDistrict;
        }

        if (postal && !schoolData.postalAddress) schoolData.postalAddress = postal;

        if (code) {
            const existingSchool = await School.findOne({ code });
            if (existingSchool) {
                const updated = await School.findByIdAndUpdate(existingSchool._id, schoolData, { new: true });
                await NotificationService.notifyAll(`🏫 School updated: ${name || code}`, 'info', req.user ? req.user.fullName : 'System');
                return successResponse(res, updated, 'School updated (already existed).', 201);
            }
        }

        const school = new School(schoolData);
        await school.save();

        await NotificationService.notifyAll(`🏫 New school registered: ${name || code}`, 'success', req.user ? req.user.fullName : 'System');
        return successResponse(res, school, 'School created successfully.', 201);
    } catch (err) {
        next(err);
    }
};

const getAllSchools = async (req, res, next) => {
    try {
        const query = applyDistrictFilter(req);
        const schools = await School.find(query).sort({ name: 1 });
        return successResponse(res, schools, 'Schools list retrieved.');
    } catch (err) {
        next(err);
    }
};

const getSchoolById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const school = await School.findById(id);
        if (!school) return errorResponse(res, 'School not found.', 404);

        const scholarCount = await Scholar.countDocuments({ schoolId: id });

        const schoolWithStats = {
            ...school.toObject(),
            stats: { totalScholars: scholarCount }
        };

        return successResponse(res, schoolWithStats, 'School details retrieved.');
    } catch (err) {
        next(err);
    }
};

const updateSchool = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid School ID.', 400);

        const schoolData = { ...req.body };
        if (req.body.postal && !schoolData.postalAddress) schoolData.postalAddress = req.body.postal;

        const updated = await School.findByIdAndUpdate(id, schoolData, { new: true });

        if (!updated) return errorResponse(res, 'School not found.', 404);

        await NotificationService.notifyAll(`🏫 School updated: ${updated.name || updated.code}`, 'info', req.user ? req.user.fullName : 'System');
        return successResponse(res, updated, 'School updated successfully.');
    } catch (err) {
        next(err);
    }
};

const deleteSchool = async (req, res, next) => {
    try {
        const { id } = req.params;
        const school = await School.findByIdAndDelete(id);
        if (!school) return errorResponse(res, 'School not found.', 404);

        await NotificationService.notifyAll(`🗑️ School deleted: ${school.name || school.code}`, 'warning', req.user ? req.user.fullName : 'System');
        return successResponse(res, { id }, 'School deleted successfully.');
    } catch (err) {
        next(err);
    }
};

const toggleSchoolStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const school = await School.findById(id);
        if (!school) return errorResponse(res, 'School not found.', 404);

        school.status = school.status === 'Active' ? 'Inactive' : 'Active';
        await school.save();

        return successResponse(res, school, `School status changed to ${school.status}.`);
    } catch (err) {
        next(err);
    }
};

/**
 * Scholar Progression / Promotion Logic
 */
const getScholarsForPromotion = async (req, res, next) => {
    try {
        const { schoolId, year } = req.query;

        const scholars = await Scholar.find({ schoolId });

        const scholarsWithStatus = await Promise.all(scholars.map(async (scholar) => {
            const results = await AcademicResult.find({ scholarId: scholar._id, year });

            let average = 0;
            let passed = false;

            if (results.length > 0) {
                const totalMarks = results.reduce((sum, r) => sum + (r.marks || 0), 0);
                average = totalMarks / results.length;
                passed = average >= 50;
            }

            return {
                ...scholar.toObject(),
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

const promoteScholar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scholar = await Scholar.findById(id);

        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);

        const currentClass = scholar.academicYear;
        let nextClass = currentClass;

        if (scholar.schoolType === 'Secondary') {
            if (currentClass.startsWith('Form ')) {
                const formNum = parseInt(currentClass.replace('Form ', ''));
                if (!isNaN(formNum)) nextClass = `Form ${formNum + 1}`;
            } else {
                nextClass = 'Form 1';
            }
        } else if (scholar.schoolType === 'University') {
            if (currentClass.startsWith('Year ')) {
                const yearNum = parseInt(currentClass.replace('Year ', ''));
                if (!isNaN(yearNum)) nextClass = `Year ${yearNum + 1}`;
            } else {
                nextClass = 'Year 1';
            }
        }

        scholar.academicYear = nextClass;
        await scholar.save();

        await NotificationService.notifyAll(`📈 Scholar promoted: ${scholar.fullName} moved to ${nextClass}`, 'success', req.user ? req.user.fullName : 'System');

        return successResponse(res, {
            scholar_id: id,
            previous_class: currentClass,
            new_class: nextClass
        }, `Scholar ${scholar.fullName} promoted successfully.`);
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
