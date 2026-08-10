const Scholar = require('../models/Scholar');
const Event = require('../models/Event');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all pending activities across different modules
 */
const getPendingActivities = async (req, res, next) => {
    try {
        const scholars = await Scholar.find({ status: 'Pending' }).populate('schoolId sponsorId userId');
        const events = await Event.find({ status: 'Pending' });

        return successResponse(res, {
            scholars,
            events,
            totalCount: scholars.length + events.length
        }, 'Pending activities retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Approve a specific activity
 */
const approveActivity = async (req, res, next) => {
    try {
        const { type, id } = req.params;
        const userRole = (req.user?.role || '').toLowerCase();
        let result;

        switch (type.toLowerCase()) {
            case 'scholar':
                // Role check: Only Admin, Country Director, and Program Coordinator/Manager can approve scholars
                if (!['administrator', 'admin', 'country director', 'program coordinator', 'program manager'].includes(userRole)) {
                    return errorResponse(res, 'You do not have permission to approve scholars.', 403);
                }
                result = await Scholar.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
                if (result) {
                    await NotificationService.notifyAll(`🎓 Scholar approved: ${result.fullName || 'New Scholar'}`, 'success', req.user?.fullName);
                }
                break;
            case 'event':
                result = await Event.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
                if (result) {
                    await NotificationService.notifyAll(`✅ Event approved: ${result.title}`, 'success', req.user?.fullName);
                }
                break;
            default:
                return errorResponse(res, 'Invalid activity type.', 400);
        }

        if (!result) return errorResponse(res, `${type} not found or already processed.`, 404);

        return successResponse(res, result, `${type} approved successfully.`);
    } catch (err) {
        next(err);
    }
};

/**
 * Reject/Delete a specific activity
 */
const rejectActivity = async (req, res, next) => {
    try {
        const { type, id } = req.params;
        const userRole = (req.user?.role || '').toLowerCase();
        let result;

        switch (type.toLowerCase()) {
            case 'scholar':
                // Role check
                if (!['administrator', 'admin', 'country director', 'program coordinator', 'program manager'].includes(userRole)) {
                    return errorResponse(res, 'You do not have permission to reject scholars.', 403);
                }
                result = await Scholar.findByIdAndDelete(id);
                if (result) {
                    await NotificationService.notifyAll(`❌ Scholar registration rejected: ${result.fullName || 'Scholar'}`, 'warning', req.user?.fullName || 'System');
                }
                break;
            case 'event':
                result = await Event.findByIdAndDelete(id);
                if (result) {
                    await NotificationService.notifyAll(`❌ Event creation rejected: "${result.title}"`, 'warning', req.user?.fullName || 'System');
                }
                break;
            default:
                return errorResponse(res, 'Invalid activity type.', 400);
        }

        if (!result) return errorResponse(res, `${type} not found.`, 404);

        return successResponse(res, { id }, `${type} rejected/removed successfully.`);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPendingActivities,
    approveActivity,
    rejectActivity
};
