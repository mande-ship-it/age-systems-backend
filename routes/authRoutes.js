const express = require('express');
const router = express.Router();

const { login, verifyOTP, changePassword, getProfile, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginRules, verifyOTPRules } = require('../validations/userValidation');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginRules, validate, login);
router.post('/verify-otp', verifyOTPRules, validate, verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', auth, getProfile);
router.post('/change-password', auth, changePassword);

module.exports = router;
