const { body } = require('express-validator');

const sponsorRules = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Sponsor/Entity name is required'),
    body('contactPerson')
        .trim()
        .notEmpty()
        .withMessage('Primary contact person is required'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email address is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required'),
    body('sponsorshipType')
        .optional()
        .trim(),
    body('amount')
        .optional()
        .isNumeric()
        .withMessage('Amount must be a number'),
    body('registrationDate')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('Invalid date format (ISO8601 expected)'),
    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Pending'])
        .withMessage('Status must be Active, Inactive or Pending')
];

module.exports = {
    sponsorRules
};
