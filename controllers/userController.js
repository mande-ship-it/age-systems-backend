const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcrypt');
const { sendOTP } = require('../utils/notifier');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().populate('roleId departmentId').sort({ createdAt: -1 });
        return successResponse(res, users);
    } catch (err) {
        next(err);
    }
};

const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid User ID', 400);

        const user = await User.findById(id).populate('roleId departmentId');
        if (!user) return errorResponse(res, 'User not found', 404);

        return successResponse(res, user);
    } catch (err) {
        next(err);
    }
};

const createUser = async (req, res, next) => {
    try {
        const { email, username, fullName, roleName, departmentName, departmentId, password } = req.body;

        console.log('Attempting to create user:', { email, username, roleName, departmentId });

        const existing = await User.findOne({
            $or: [
                { email: (email || '').toLowerCase() },
                { username: (username || '').toLowerCase() }
            ]
        });

        if (existing) {
            console.log('User creation failed: User already exists');
            return errorResponse(res, 'A user with this email or username already exists.', 400);
        }

        // Resolve Role
        let role;
        if (roleName) {
            role = await Role.findOne({ name: roleName });
        }

        // Resolve Department
        let dept;
        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            dept = await Department.findById(departmentId);
        } else if (departmentName) {
            dept = await Department.findOne({ name: departmentName });
        }

        const tempPassword = password || Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setHours(otpExpiry.getHours() + 48);

        const user = new User({
            ...req.body,
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            passwordHash,
            roleId: role?._id,
            departmentId: dept?._id,
            assignedDistrict: req.body.assignedDistrict,
            otpCode,
            otpExpiry,
            isFirstLogin: true
        });

        await user.save();
        console.log('User created successfully:', user._id);

        // Email logic...
        try {
            await sendOTP(user, otpCode, tempPassword, roleName);
        } catch (e) {
            console.error('Failed to send OTP email:', e.message);
        }

        await NotificationService.notifyAll(`👤 New User: ${fullName}`, 'success', req.user ? req.user.fullName : 'System');
        return successResponse(res, { user, temp_password: tempPassword }, 'User created successfully.', 201);
    } catch (err) {
        console.error('createUser error:', err);
        next(err);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { roleName, departmentId, email, username } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid User ID.', 400);
        }

        const updateData = { ...req.body };

        // Resolve Role if name provided
        if (roleName) {
            const role = await Role.findOne({ name: roleName });
            if (role) updateData.roleId = role._id;
        }

        // Validate Department if ID provided
        if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
            delete updateData.departmentId; // Remove invalid ID
        }

        // Clean up password from generic update to prevent accidental hash override
        delete updateData.password;
        if (email) updateData.email = email.toLowerCase();
        if (username) updateData.username = username.toLowerCase();

        const updated = await User.findByIdAndUpdate(id, updateData, { new: true })
            .populate('roleId departmentId');

        if (!updated) return errorResponse(res, 'User not found.', 404);

        await NotificationService.notifyAll(`📝 User updated: ${updated.fullName}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, updated, 'User profile updated successfully.');
    } catch (err) {
        console.error('updateUser error:', err);
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        await User.findByIdAndDelete(req.params.id);

        if (user) {
            await NotificationService.notifyAll(`🗑️ User deleted: ${user.fullName}`, 'warning', req.user ? req.user.fullName : 'System');
        }

        return successResponse(res, null, 'User deleted.');
    } catch (err) {
        next(err);
    }
};

const getActiveUsers = async (req, res, next) => {
    try {
        // Return users who have logged in, sorted by most recent first
        const users = await User.find({ lastLogin: { $ne: null } })
            .select('fullName username lastLogin profilePicture email roleId')
            .populate('roleId', 'name')
            .sort({ lastLogin: -1 })
            .limit(10);

        return successResponse(res, users, 'Active users retrieved.');
    } catch (err) {
        next(err);
    }
};

const getDirector = async (req, res, next) => {
    try {
        // Try to find a user with 'Director' in their name
        let user = await User.findOne({ fullName: /Director/i }).sort({ createdAt: 1 });

        if (!user) {
            // Try to find by role
            const role = await Role.findOne({ name: /Director/i });
            if (role) {
                user = await User.findOne({ roleId: role._id });
            }
        }

        const name = user ? user.fullName : 'EDWARD YOUNG SHABA';
        return successResponse(res, { name }, 'Director name retrieved.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getDirector,
    getActiveUsers
};
