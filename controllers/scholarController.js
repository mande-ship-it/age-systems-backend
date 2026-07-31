const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const Document = require('../models/Document');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Internship = require('../models/Internship');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all scholars
 */
const getAllScholars = async (req, res, next) => {
    try {
        const scholars = await Scholar.getAll();
        return successResponse(res, scholars, 'Scholars retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get scholar by ID (Comprehensive Full Profile)
 */
const getScholarById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scholar = await Scholar.findById(id);
        if (!scholar) {
            return errorResponse(res, 'Scholar not found.', 404);
        }

        // Fetch all related data in parallel
        const [results, documents, payments, attendance, internship] = await Promise.all([
            AcademicResult.getByScholar(scholar.id),
            Document.getByScholar(scholar.id),
            Payment.getByScholar(scholar.id),
            Attendance.getSummaryByScholar(scholar.id),
            Internship.findByScholarId(scholar.id)
        ]);

        // Calculate summary stats for the "Overview" and "Statistics" tabs
        let totalMarks = 0;
        let averageMark = 0;
        if (results.length > 0) {
            totalMarks = results.reduce((sum, r) => sum + parseFloat(r.marks), 0);
            averageMark = totalMarks / results.length;
        }

        const fullProfile = {
            ...scholar,
            academic_results: results,
            documents: documents,
            payments: payments,
            attendance: attendance,
            internship: internship,
            summary: {
                average_mark: averageMark.toFixed(1),
                total_subjects: results.length,
                total_payments: payments.length,
                attendance_rate: attendance.total_sessions > 0
                    ? ((attendance.present / attendance.total_sessions) * 100).toFixed(1)
                    : "0.0"
            }
        };

        return successResponse(res, fullProfile, 'Comprehensive scholar profile retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new scholar (Standing tracking only, no system user login)
 */
const createScholar = async (req, res, next) => {
    try {
        const {
            name, fullName, email, phone, sex, dob, schoolType, schoolName,
            schoolId, currentClass, academicYear, programType, programName, startYear, endYear,
            district, village, donor, sponsorId, previousSchool,
            guardianName, guardianPhone, guardianEmail, guardianRelation, guardianOccupation
        } = req.body;

        const scholarName = name || fullName;
        const scholarAcademicYear = currentClass || academicYear;

        // Auto-resolve sponsorId if donor name is provided
        let resolvedSponsorId = sponsorId;
        if (!resolvedSponsorId && donor) {
            const Sponsor = require('../models/Sponsor');
            const sponsor = await Sponsor.getByName(donor);
            if (sponsor) resolvedSponsorId = sponsor.id;
        }

        const finalSchoolId = schoolId ? parseInt(schoolId) : null;
        const finalSponsorId = resolvedSponsorId ? parseInt(resolvedSponsorId) : null;

        // Create scholar profile directly
        const scholarProfile = await Scholar.create({
            fullName: scholarName,
            email: email || null,
            schoolId: finalSchoolId,
            sponsorId: finalSponsorId,
            dob,
            sex,
            phone,
            village,
            district,
            schoolType,
            schoolName,
            previousSchool,
            programType,
            programName,
            startYear,
            endYear,
            donor,
            academicYear: scholarAcademicYear,
            guardianName,
            guardianPhone,
            guardianEmail,
            guardianRelation,
            guardianOccupation,
            status: 'Pending' // New scholars require approval
        });

        await NotificationService.notifyAll(`🎓 New Scholar registration pending: ${scholarName}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, {
            scholar: scholarProfile
        }, 'Scholar registered for tracking successfully.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Update scholar profile
 */
const updateScholar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const scholar = await Scholar.findById(id);
        if (!scholar) {
            return errorResponse(res, 'Scholar not found.', 404);
        }

        // Map frontend fields to DB fields
        const mappedData = {};
        if (updateData.fullName !== undefined) mappedData.fullName = updateData.fullName;
        if (updateData.name !== undefined) mappedData.fullName = updateData.name;
        if (updateData.email !== undefined) mappedData.email = updateData.email;
        if (updateData.schoolId !== undefined) mappedData.schoolId = updateData.schoolId;
        if (updateData.schoolName !== undefined) mappedData.schoolName = updateData.schoolName;
        if (updateData.schoolType !== undefined) mappedData.schoolType = updateData.schoolType;
        if (updateData.previousSchool !== undefined) mappedData.previousSchool = updateData.previousSchool;
        if (updateData.sponsorId !== undefined) mappedData.sponsorId = updateData.sponsorId;
        if (updateData.status !== undefined) mappedData.status = updateData.status;
        
        const updatedAcademicYear = updateData.currentClass !== undefined ? updateData.currentClass : updateData.academicYear;
        if (updatedAcademicYear !== undefined) mappedData.academicYear = updatedAcademicYear;

        if (updateData.dob !== undefined) mappedData.dob = updateData.dob;
        if (updateData.sex !== undefined) mappedData.sex = updateData.sex;
        if (updateData.phone !== undefined) mappedData.phone = updateData.phone;
        if (updateData.village !== undefined) mappedData.village = updateData.village;
        if (updateData.district !== undefined) mappedData.district = updateData.district;
        if (updateData.programType !== undefined) mappedData.programType = updateData.programType;
        if (updateData.programName !== undefined) mappedData.programName = updateData.programName;
        if (updateData.startYear !== undefined) mappedData.startYear = updateData.startYear;
        if (updateData.endYear !== undefined) mappedData.endYear = updateData.endYear;
        if (updateData.donor !== undefined) mappedData.donor = updateData.donor;

        // Guardian details mapping
        if (updateData.guardianName !== undefined) mappedData.guardianName = updateData.guardianName;
        if (updateData.guardianPhone !== undefined) mappedData.guardianPhone = updateData.guardianPhone;
        if (updateData.guardianEmail !== undefined) mappedData.guardianEmail = updateData.guardianEmail;
        if (updateData.guardianRelation !== undefined) mappedData.guardianRelation = updateData.guardianRelation;
        if (updateData.guardianOccupation !== undefined) mappedData.guardianOccupation = updateData.guardianOccupation;

        const updatedScholar = await Scholar.update(id, mappedData);

        await NotificationService.notifyAll(`📝 Scholar tracking updated: ${updatedScholar.full_name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, updatedScholar, 'Scholar record updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Approve a scholar profile
 */
const approveScholar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scholar = await Scholar.findById(id);
        if (!scholar) {
            return errorResponse(res, 'Scholar not found.', 404);
        }

        const approvedScholar = await Scholar.approve(id);

        await NotificationService.notifyAll(`✅ Scholar approved: ${approvedScholar.full_name}`, 'success', req.user ? req.user.fullName : 'System');

        return successResponse(res, approvedScholar, 'Scholar approved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a scholar
 */
const deleteScholar = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scholar = await Scholar.findById(id);
        if (!scholar) {
            return errorResponse(res, 'Scholar not found.', 404);
        }

        const name = scholar.full_name;
        await Scholar.delete(scholar.id);

        await NotificationService.notifyAll(`🗑️ Scholar removed: ${name}`, 'warning', req.user ? req.user.fullName : 'System');

        return successResponse(res, { id }, 'Scholar record deleted successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get scholars by school
 */
const getScholarsBySchool = async (req, res, next) => {
    try {
        const { schoolId, schoolName } = req.query;
        if (!schoolId && !schoolName) {
            return errorResponse(res, 'School ID or School Name is required.', 400);
        }
        const scholars = await Scholar.getBySchool(schoolId, schoolName);
        return successResponse(res, scholars, 'Scholars retrieved for school.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get university scholars who have graduated
 */
const getUniversityGraduates = async (req, res, next) => {
    try {
        const graduates = await Scholar.getUniversityGraduates();
        return successResponse(res, graduates, 'University graduates retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get scholars who are now Alumni (Allocated internships)
 */
const getAlumni = async (req, res, next) => {
    try {
        const alumni = await Scholar.getAlumni();
        return successResponse(res, alumni, 'Alumni records retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get scholar overall statistics
 */
const getScholarStats = async (req, res, next) => {
    try {
        const stats = await Scholar.getStats();
        return successResponse(res, stats, 'Scholar statistics retrieved.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllScholars,
    getScholarById,
    createScholar,
    updateScholar,
    approveScholar,
    deleteScholar,
    getScholarsBySchool,
    getUniversityGraduates,
    getAlumni,
    getScholarStats
};
