const { body } = require('express-validator');

const createPaymentRules = [
    body('scholarId')
        .isInt()
        .withMessage('Scholar ID must be an integer'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('purpose')
        .trim()
        .notEmpty()
        .withMessage('Payment purpose is required'),
    body('paymentDate')
        .optional()
        .isDate()
        .withMessage('Payment date must be a valid date YYYY-MM-DD')
];

const updatePaymentRules = [
    body('status')
        .isIn(['Pending', 'Completed', 'Failed', 'Refunded'])
        .withMessage('Status must be Pending, Completed, Failed, or Refunded')
];

module.exports = {
    createPaymentRules,
    updatePaymentRules
};
