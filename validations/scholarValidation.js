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
        .trim()
        .notEmpty()
        .withMessage('Phone number is required'),
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
        .if(body('academicYear').not().exists())
        .trim()
        .notEmpty()
        .withMessage('Current class / Form is required'),
    body('academicYear')
        .if(body('currentClass').not().exists())
        .trim()
        .notEmpty()
        .withMessage('Academic year is required (e.g. 2026/2027)'),
    body('district')
        .trim()
        .notEmpty()
        .withMessage('District is required'),
    body('village')
        .trim()
        .notEmpty()
        .withMessage('Home village is required'),
    body('donor')
        .trim()
        .notEmpty()
        .withMessage('Donor is required'),
    body('startYear')
        .trim()
        .notEmpty()
        .withMessage('Start year is required'),
    body('endYear')
        .trim()
        .notEmpty()
        .withMessage('End year is required'),
    body('previousSchool')
        .trim()
        .notEmpty()
        .withMessage('Previous school is required'),
    body('programName')
        .if(body('schoolType').equals('University'))
        .trim()
        .notEmpty()
        .withMessage('Program of study is required for university students')
];

const updateScholarRules = [
    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Graduated', 'Suspended'])
        .withMessage('Status must be Active, Inactive, Graduated, or Suspended'),
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
