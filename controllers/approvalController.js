const Scholar = require('../models/Scholar');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all pending activities across different modules
 */
const getPendingActivities = async (req, res, next) => {
    try {
        const pendingScholars = await Scholar.getAll(); // Filter by status locally for now or add method
        const pendingEvents = await Event.getAll('Pending');
        const pendingPayments = await Payment.getAll('Pending');

        const scholars = pendingScholars.filter(s => s.status === 'Pending');

        return successResponse(res, {
            scholars,
            events: pendingEvents,
            payments: pendingPayments,
            totalCount: scholars.length + pendingEvents.length + pendingPayments.length
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
        const userRole = req.user?.role || '';
        let result;

        switch (type.toLowerCase()) {
            case 'scholar':
                // Role check: Only Admin, Country Director, and Program Coordinator/Manager can approve scholars
                if (!['Administrator', 'Admin', 'Country Director', 'Program Coordinator', 'Program Manager'].includes(userRole)) {
                    return errorResponse(res, 'You do not have permission to approve scholars.', 403);
                }
                result = await Scholar.approve(id);
                if (result) {
                    await NotificationService.notifyAll(`🎓 Scholar approved: ${result.full_name || 'New Scholar'}`, 'success', req.user?.fullName);
                }
                break;
            case 'event':
                result = await Event.approve(id);
                if (result) {
                    await NotificationService.notifyAll(`✅ Event approved: ${result.title}`, 'success', req.user?.fullName);
                }
                break;
            case 'payment':
                result = await Payment.approve(id);
                if (result) {
                    await NotificationService.notifyAll(`💰 Payment disbursement approved: MWK ${result.amount}`, 'success', req.user?.fullName);
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
        const userRole = req.user?.role || '';
        let result;

        switch (type.toLowerCase()) {
            case 'scholar':
                // Role check: Only Admin, Country Director, and Program Coordinator/Manager can reject scholars
                if (!['Administrator', 'Admin', 'Country Director', 'Program Coordinator', 'Program Manager'].includes(userRole)) {
                    return errorResponse(res, 'You do not have permission to reject scholars.', 403);
                }
                const scholar = await Scholar.findById(id);
                result = await Scholar.delete(id);
                if (result && scholar) {
                    await NotificationService.notifyAll(`❌ Scholar registration rejected: ${scholar.full_name || 'Scholar'}`, 'warning', req.user?.fullName || 'System');
                }
                break;
            case 'event':
                const event = await Event.findById(id);
                result = await Event.delete(id);
                if (result && event) {
                    await NotificationService.notifyAll(`❌ Event creation rejected: "${event.title}"`, 'warning', req.user?.fullName || 'System');
                }
                break;
            case 'payment':
                result = await Payment.reject(id);
                if (result) {
                    await NotificationService.notifyAll(`❌ Payment disbursement rejected: MWK ${result.amount}`, 'warning', req.user?.fullName || 'System');
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
