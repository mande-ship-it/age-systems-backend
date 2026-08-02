const { body } = require('express-validator');

const createScholarRules = [
    body('email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Scholar email must be a valid email address')
        .normalizeEmail(),
    body('name')
        .if(body('fullName').not().exists())
        .trim()
        .notEmpty()
        .withMessage('Scholar name is required'),
    body('fullName')
        .if(body('name').not().exists())
        .trim()
        .notEmpty()
        .withMessage('Scholar full name is required'),
    body('dob')
        .notEmpty()
        .withMessage('Date of birth is required'),
    body('phone')
        .optional({ checkFalsy: true })
        .trim(),
    body('sex')
        .optional()
        .isIn(['Female', 'Male', 'Other'])
        .withMessage('Sex must be Female, Male, or Other'),
    body('schoolType')
        .trim()
        .notEmpty()
        .withMessage('School type is required'),
    body('schoolName')
        .trim()
        .notEmpty()
        .withMessage('School name is required'),
    body('currentClass')
        .optional({ checkFalsy: true })
        .trim(),
    body('academicYear')
        .optional({ checkFalsy: true })
        .trim(),
    body('district')
        .optional({ checkFalsy: true })
        .trim(),
    body('village')
        .optional({ checkFalsy: true })
        .trim(),
    body('donor')
        .optional({ checkFalsy: true })
        .trim(),
    body('startYear')
        .optional({ checkFalsy: true })
        .trim(),
    body('endYear')
        .optional({ checkFalsy: true })
        .trim(),
    body('previousSchool')
        .optional({ checkFalsy: true })
        .trim(),
    body('programName')
        .if(body('schoolType').equals('University'))
        .optional({ checkFalsy: true })
        .trim()
];

const updateScholarRules = [
    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Graduated', 'Suspended', 'Alumni'])
        .withMessage('Status must be Active, Inactive, Graduated, Suspended, or Alumni'),
    body('email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Valid email required'),
    body('name').optional().trim().notEmpty(),
    body('fullName').optional().trim().notEmpty(),
    body('dob').optional().isDate(),
    body('phone').optional().trim().notEmpty(),
    body('schoolType').optional().trim().notEmpty(),
    body('schoolName').optional().trim().notEmpty(),
    body('currentClass').optional().trim().notEmpty(),
    body('academicYear').optional().trim().notEmpty(),
    body('district').optional().trim().notEmpty(),
    body('village').optional().trim().notEmpty(),
    body('donor').optional().trim().notEmpty(),
    body('startYear').optional().trim().notEmpty(),
    body('endYear').optional().trim().notEmpty(),
    body('previousSchool').optional().trim().notEmpty(),
    body('programName').optional().trim().notEmpty()
];

module.exports = {
    createScholarRules,
    updateScholarRules
};
