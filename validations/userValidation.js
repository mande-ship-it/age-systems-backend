const { body } = require('express-validator');

const loginRules = [
    body('email')
        .if(body('username').not().exists())
        .if(body('identifier').not().exists())
        .notEmpty()
        .withMessage('Email, username, or identifier is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const verifyOTPRules = [
    body('userId').isMongoId().withMessage('Valid User ID is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

const createUserRules = [
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required'),
    body('username')
        .trim()
        .isLength({ min: 4 })
        .withMessage('Username must be at least 4 characters'),
    body('email')
        .isEmail()
        .withMessage('Valid email required'),
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters if provided'),
    body('roleName')
        .if(body('role_name').not().exists())
        .notEmpty()
        .withMessage('Role is required (as roleName or role_name)')
];

module.exports = {
    loginRules,
    verifyOTPRules,
    createUserRules
};
