const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { sendOTP } = require('../utils/notifier');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Handle user login
 */
const login = async (req, res, next) => {
    try {
        const { email, username, identifier: id, password } = req.body;

        // Support email, username or a generic identifier key
        const identifier = (email || username || id || '').toString().trim().toLowerCase();
        const providedPassword = (password || '').toString().trim();

        console.log(`DEBUG: Login attempt for [${identifier}]. Provided keys: [${Object.keys(req.body).join(', ')}]`);

        // Find user by email or username
        let user = await User.findByEmail(identifier);
        if (!user) {
            user = await User.findByUsername(identifier);
        }

        if (!user) {
            console.log(`Login failed: User not found [${identifier}]`);
            return errorResponse(res, 'Invalid credentials.', 401);
        }

        if (!user.is_active) {
            console.log(`Login failed: Account inactive [${identifier}]`);
            return errorResponse(res, 'Account is disabled. Contact administrator.', 403);
        }

        let isMatch = false;
        let isOTPLogin = false;

        if (user.is_first_login) {
            // First-time login: user can use the 2-day OTP code as the password
            if (user.otp_code && providedPassword === user.otp_code) {
                // Check if OTP is expired
                if (new Date() > new Date(user.otp_expiry)) {
                    console.log(`Login failed: OTP expired [${identifier}]`);
                    return errorResponse(res, 'First-time login OTP has expired (valid for 2 days). Please contact your administrator.', 401);
                }
                isMatch = true;
                isOTPLogin = true;
                console.log(`Login success: OTP used [${identifier}]`);
            } else {
                // Fallback check against hashed password
                isMatch = await bcrypt.compare(providedPassword, user.password_hash);
                if (isMatch) console.log(`Login success: Temp/Regular password used [${identifier}]`);
            }
        } else {
            // Regular login: verify password hash
            isMatch = await bcrypt.compare(providedPassword, user.password_hash);
        }

        if (!isMatch) {
            console.log(`Login failed: Password mismatch for [${identifier}]`);
            return errorResponse(res, 'Invalid credentials.', 401);
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role_name, fullName: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login
        await User.update(user.id, { lastLogin: new Date() });

        return successResponse(res, {
            token,
            user: {
                id: user.id,
                fullName: user.full_name,
                username: user.username,
                email: user.email,
                role: user.role_name,
                department: user.department,
                isFirstLogin: user.is_first_login || isOTPLogin,
                mustResetPassword: user.is_first_login || isOTPLogin
            }
        }, 'Login successful.');

    } catch (err) {
        next(err);
    }
};

/**
 * Verify OTP for first login
 */
const verifyOTP = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;

        const user = await User.findById(userId);
        if (!user || !user.otp_code) {
            return errorResponse(res, 'Invalid verification request.', 400);
        }

        if (new Date() > new Date(user.otp_expiry)) {
            return errorResponse(res, 'OTP has expired.', 400);
        }

        if (user.otp_code !== otp) {
            return errorResponse(res, 'Invalid OTP code.', 400);
        }

        // Mark as first login complete and clear OTP
        await User.update(user.id, {
            isFirstLogin: false,
            otpCode: null,
            otpExpiry: null,
            lastLogin: new Date()
        });

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role_name, fullName: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return successResponse(res, {
            token,
            user: {
                id: user.id,
                fullName: user.full_name,
                username: user.username,
                email: user.email,
                role: user.role_name,
                department: user.department
            }
        }, 'Account verified and login successful.');

    } catch (err) {
        next(err);
    }
};

/**
 * Change password (used for first-time password setup or updates)
 */
const changePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!newPassword || newPassword.length < 6) {
            return errorResponse(res, 'New password must be at least 6 characters long.', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password, set isFirstLogin to false, and clear OTP fields
        await User.update(userId, {
            passwordHash,
            isFirstLogin: false,
            otpCode: null,
            otpExpiry: null
        });

        return successResponse(res, null, 'Password changed successfully. You can now use your new password.');
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
        const user = await User.findByEmail(email);

        if (!user) {
            // We return 200 for security to not leak registered emails,
            // but we only send the email if the user exists.
            return successResponse(res, null, 'If that email is registered, a reset code has been sent.');
        }

        const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1); // 1 hour expiry

        await User.update(user.id, {
            otpCode: resetOTP,
            otpExpiry: expiry
        });

        const { sendPasswordResetEmail } = require('../utils/notifier');
        await sendPasswordResetEmail({
            email: user.email,
            name: user.full_name,
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
        const user = await User.findByEmail(email);

        if (!user || user.otp_code !== otp) {
            return errorResponse(res, 'Invalid reset code or email.', 400);
        }

        if (new Date() > new Date(user.otp_expiry)) {
            return errorResponse(res, 'Reset code has expired.', 400);
        }

        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await User.update(user.id, {
            passwordHash,
            otpCode: null,
            otpExpiry: null,
            isFirstLogin: false // In case they reset during first login
        });

        return successResponse(res, null, 'Password reset successful. You can now log in.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    login,
    verifyOTP,
    changePassword,
    getProfile,
    forgotPassword,
    resetPassword
};
