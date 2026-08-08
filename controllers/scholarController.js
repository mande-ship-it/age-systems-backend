const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const Document = require('../models/Document');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Internship = require('../models/Internship');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');
const mongoose = require('mongoose');
const { applyDistrictFilter } = require('../utils/districtFilter');

/**
 * Get all scholars
 */
const getAllScholars = async (req, res, next) => {
    try {
        const query = applyDistrictFilter(req);
        const scholars = await Scholar.find(query).populate('schoolId sponsorId userId').sort({ fullName: 1 });
        return successResponse(res, scholars);
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

        // Apply District Security
        const query = applyDistrictFilter(req, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null });
        if (!mongoose.Types.ObjectId.isValid(id)) {
            query.scholarId = id;
            delete query._id;
        }

        const scholar = await Scholar.findOne(query).populate('schoolId sponsorId userId');

        if (!scholar) return errorResponse(res, 'Scholar not found or access denied for this district.', 404);

        // Fetch all related data in parallel
        const [results, documents, payments, attendance, internship] = await Promise.all([
            AcademicResult.find({ scholarId: scholar._id }).populate('subjectId'),
            Document.find({ scholarId: scholar._id }),
            Payment.find({ scholarId: scholar._id }),
            Attendance.find({ scholarId: scholar._id }).populate('sessionId'),
            Internship.findOne({ scholarId: scholar._id })
        ]);

        // Calculate summary stats
        let totalMarks = 0;
        let averageMark = 0;
        if (results.length > 0) {
            totalMarks = results.reduce((sum, r) => sum + (r.marks || 0), 0);
            averageMark = totalMarks / results.length;
        }

        const fullProfile = {
            ...scholar.toObject(),
            academic_results: results,
            documents: documents,
            payments: payments,
            attendance_history: attendance,
            internship: internship,
            summary: {
                average_mark: averageMark.toFixed(1),
                total_subjects: results.length,
                total_payments: payments.length,
                attendance_rate: attendance.length > 0
                    ? ((attendance.filter(a => a.status === 'present').length / attendance.length) * 100).toFixed(1)
                    : "0.0"
            }
        };

        return successResponse(res, fullProfile);
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new scholar
 */
const createScholar = async (req, res, next) => {
    try {
        const scholarData = { ...req.body };

        // Ensure scholarId is not passed from frontend during registration
        delete scholarData.scholarId;
        delete scholarData.scholar_id;

        // Security: Field Officers can only register scholars for their own district
        if (req.user && req.user.role && req.user.role.toLowerCase().includes('field')) {
            if (req.user.assignedDistrict) {
                scholarData.district = req.user.assignedDistrict;
            }

            // Restriction: Field Officers can only register Secondary School scholars
            if (scholarData.schoolType !== 'Secondary') {
                return errorResponse(res, 'Access denied. Field Officers are restricted to registering secondary school scholars only.', 403);
            }
        }

        // Handle name mapping for frontend compatibility
        if (scholarData.name && !scholarData.fullName) {
            scholarData.fullName = scholarData.name;
        }

        // Sync academicYear and currentClass
        if (scholarData.currentClass && !scholarData.academicYear) {
            scholarData.academicYear = scholarData.currentClass;
        } else if (scholarData.academicYear && !scholarData.currentClass) {
            scholarData.currentClass = scholarData.academicYear;
        }

        // Progression Baseline (Spec Section 1)
        if (!scholarData.registeredClass) {
            scholarData.registeredClass = scholarData.academicYear;
        }
        if (!scholarData.programStartYearLabel) {
            scholarData.programStartYearLabel = scholarData.registeredClass;
        }
        if (scholarData.yearsCompleted === undefined) {
            scholarData.yearsCompleted = 0;
        }

        let scholar = new Scholar(scholarData);

        try {
            await scholar.save();
        } catch (saveErr) {
            // Handle race condition for auto-generated scholarId
            if (saveErr.code === 11000 && saveErr.keyPattern && saveErr.keyPattern.scholarId) {
                console.log('[RETRY] Scholar ID clash detected, retrying registration...');
                // Re-instantiate to trigger pre-save hook logic again with fresh DB state
                // We clear scholarId so the hook re-generates it
                delete scholarData.scholarId;
                scholar = new Scholar(scholarData);
                await scholar.save();
            } else {
                throw saveErr;
            }
        }

        // Return fully populated scholar for immediate frontend display
        const populatedScholar = await Scholar.getById(scholar._id);

        await NotificationService.notifyAll(`🎓 New Scholar registered: ${populatedScholar.fullName}`, 'success', req.user ? req.user.fullName : 'System');
        return successResponse(res, populatedScholar, 'Scholar registered successfully.', 201);
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
        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid Scholar ID.', 400);

        // Sanitize body to remove ID fields that shouldn't be updated directly
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.id;
        delete updateData.scholarId;
        delete updateData.scholar_id;

        const updatedScholar = await Scholar.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!updatedScholar) return errorResponse(res, 'Scholar not found.', 404);

        await NotificationService.notifyAll(`📝 Scholar profile updated: ${updatedScholar.fullName}`, 'info', req.user ? req.user.fullName : 'System');
        return successResponse(res, updatedScholar);
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
        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid Scholar ID.', 400);

        const updated = await Scholar.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
        if (!updated) return errorResponse(res, 'Scholar not found.', 404);

        await NotificationService.notifyAll(`✅ Scholar approved: ${updated.fullName}`, 'success', req.user ? req.user.fullName : 'System');
        return successResponse(res, updated);
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
        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid Scholar ID.', 400);

        const scholar = await Scholar.findByIdAndDelete(id);
        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);

        await NotificationService.notifyAll(`🗑️ Scholar removed: ${scholar.fullName}`, 'warning', req.user ? req.user.fullName : 'System');
        return successResponse(res, { id });
    } catch (err) {
        next(err);
    }
};

/**
 * Get scholars by school
 */
const getScholarsBySchool = async (req, res, next) => {
    try {
        const { schoolId } = req.query;
        const query = applyDistrictFilter(req, { schoolId });

        const scholars = await Scholar.find(query).sort({ fullName: 1 });
        return successResponse(res, scholars);
    } catch (err) {
        next(err);
    }
};

/**
 * Get university graduates (Pending internship allocation)
 */
const getUniversityGraduates = async (req, res, next) => {
    try {
        const graduates = await Scholar.find({
            schoolType: 'University',
            status: { $in: ['Graduated', 'Awaiting Allocation'] }
        }).sort({ endYear: -1, fullName: 1 });
        return successResponse(res, graduates);
    } catch (err) {
        next(err);
    }
};

/**
 * Get alumni (Allocated scholars)
 */
const getAlumni = async (req, res, next) => {
    try {
        const alumni = await Scholar.find({ status: 'Alumni' })
            .populate('schoolId sponsorId')
            .sort({ endYear: -1, fullName: 1 });
        return successResponse(res, alumni);
    } catch (err) {
        next(err);
    }
};

/**
 * Get scholar overall statistics
 */
const getScholarStats = async (req, res, next) => {
    try {
        const [total, active, graduated, university, secondary] = await Promise.all([
            Scholar.countDocuments(),
            Scholar.countDocuments({ status: 'Active' }),
            Scholar.countDocuments({ status: 'Graduated' }),
            Scholar.countDocuments({ schoolType: 'University' }),
            Scholar.countDocuments({ schoolType: 'Secondary' })
        ]);

        return successResponse(res, { total, active, graduated, university, secondary });
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
