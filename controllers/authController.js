const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Handle user login
 */
const login = async (req, res, next) => {
    try {
        const { email, username, identifier: id, password } = req.body;

        const identifier = (email || username || id || '').toString().trim().toLowerCase();
        const providedPassword = (password || '').toString().trim();

        console.log(`DEBUG: MongoDB Login attempt for [${identifier}]`);

        // Find user by email or username
        let user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        }).populate('roleId departmentId');

        if (!user) {
            console.log(`Login failed: User not found [${identifier}]`);
            return errorResponse(res, 'Invalid credentials.', 401);
        }

        if (!user.isActive) {
            console.log(`Login failed: Account inactive [${identifier}]`);
            return errorResponse(res, 'Account is disabled. Contact administrator.', 403);
        }

        let isMatch = false;
        let isOTPLogin = false;

        if (user.isFirstLogin) {
            if (user.otpCode && providedPassword === user.otpCode) {
                if (new Date() > user.otpExpiry) {
                    return errorResponse(res, 'First-time login OTP has expired. Contact administrator.', 401);
                }
                isMatch = true;
                isOTPLogin = true;
            } else {
                isMatch = await bcrypt.compare(providedPassword, user.passwordHash);
            }
        } else {
            isMatch = await bcrypt.compare(providedPassword, user.passwordHash);
        }

        if (!isMatch) {
            return errorResponse(res, 'Invalid credentials.', 401);
        }

        // Generate Token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role_name,
                fullName: user.fullName,
                assignedDistrict: user.assignedDistrict
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        user.lastLogin = new Date();
        await user.save();

        return successResponse(res, {
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role_name,
                department: user.department_name,
                assignedDistrict: user.assignedDistrict,
                profilePicture: user.profilePicture,
                profile_picture: user.profilePicture,
                isFirstLogin: user.isFirstLogin || isOTPLogin,
                mustResetPassword: user.isFirstLogin || isOTPLogin
            }
        }, 'Login successful.');

    } catch (err) {
        next(err);
    }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        const userId = req.user.id;

        if (!newPassword || newPassword.length < 6) {
            return errorResponse(res, 'New password must be at least 6 characters.', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(userId, {
            passwordHash,
            isFirstLogin: false,
            otpCode: null,
            otpExpiry: null
        });

        return successResponse(res, null, 'Password changed successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        return successResponse(res, user);
    } catch (err) {
        next(err);
    }
};

/**
 * Forgot Password - Send OTP
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return successResponse(res, null, 'If that email is registered, a reset code has been sent.');
        }

        const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1);

        user.otpCode = resetOTP;
        user.otpExpiry = expiry;
        await user.save();

        const { sendPasswordResetEmail } = require('../utils/notifier');
        await sendPasswordResetEmail({
            email: user.email,
            name: user.fullName,
            otp: resetOTP
        });

        return successResponse(res, null, 'Reset code sent to your email.');
    } catch (err) {
        next(err);
    }
};

/**
 * Reset Password using OTP
 */
const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || user.otpCode !== otp) {
            return errorResponse(res, 'Invalid reset code or email.', 400);
        }

        if (new Date() > user.otpExpiry) {
            return errorResponse(res, 'Reset code has expired.', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        user.passwordHash = passwordHash;
        user.otpCode = null;
        user.otpExpiry = null;
        user.isFirstLogin = false;
        await user.save();

        return successResponse(res, null, 'Password reset successful.');
    } catch (err) {
        next(err);
    }
};

/**
 * Verify OTP
 */
const verifyOTP = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;
        const user = await User.findById(userId);

        if (!user || user.otpCode !== otp) {
            return errorResponse(res, 'Invalid OTP.', 400);
        }

        if (new Date() > user.otpExpiry) {
            return errorResponse(res, 'OTP has expired.', 400);
        }

        return successResponse(res, null, 'OTP verified successfully.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    login,
    changePassword,
    getProfile,
    forgotPassword,
    resetPassword,
    verifyOTP
};
