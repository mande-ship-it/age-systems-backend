const { body } = require('express-validator');

const schoolRules = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('School name is required'),
    body('code')
        .optional({ checkFalsy: true })
        .trim(),
    body('level')
        .optional({ checkFalsy: true })
        .trim(),
    body('type')
        .optional({ checkFalsy: true })
        .trim(),
    body('genderPolicy')
        .optional({ checkFalsy: true })
        .trim(),
    body('region')
        .optional({ checkFalsy: true })
        .trim(),
    body('district')
        .optional({ checkFalsy: true })
        .trim(),
    body('phone')
        .optional({ checkFalsy: true })
        .trim(),
    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    body('adminEmail')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid admin email format')
        .normalizeEmail(),
    body('status')
        .optional()
        .isIn(['Active', 'Inactive'])
        .withMessage('Status must be Active or Inactive')
];

module.exports = {
    schoolRules
};
