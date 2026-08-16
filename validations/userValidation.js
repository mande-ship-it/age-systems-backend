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
        .optional({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters if provided'),
    body('roleId')
        .if(body('roleName').not().exists())
        .notEmpty()
        .withMessage('Role is required (select a role or provide roleName)')
];

module.exports = {
    loginRules,
    verifyOTPRules,
    createUserRules
};
