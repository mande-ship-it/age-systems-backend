const Payment = require('../models/Payment');
const Scholar = require('../models/Scholar');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Record a new payment disbursement request
 */
const recordPayment = async (req, res, next) => {
    try {
        const { scholarId, amount, purpose, paymentDate } = req.body;

        const scholar = await Scholar.findById(scholarId);
        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);

        const payment = new Payment({
            scholarId,
            amount,
            purpose,
            paymentDate,
            status: 'Pending'
        });

        await payment.save();

        await NotificationService.notifyAll(`💰 New Payment request: MWK ${amount} for ${scholar.fullName}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, payment, 'Payment request recorded and awaiting approval.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Get all payments for a specific scholar
 */
const getPaymentsByScholar = async (req, res, next) => {
    try {
        const { scholarId } = req.params;
        const payments = await Payment.find({ scholarId }).sort({ paymentDate: -1 });
        return successResponse(res, payments);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    recordPayment,
    getPaymentsByScholar
};
