const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcrypt');
const { sendOTP } = require('../utils/notifier');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all users
 */
const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.getAll();
        return successResponse(res, users, 'Users retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new system user
 */
const createUser = async (req, res, next) => {
    try {
        const {
            fullName, username, email, phone, password, roleName, role_name, roleId, role_id, department, departmentName, departmentId, department_id, location, bio, isActive, notes
        } = req.body;

        // Support multiple field naming conventions
        const targetRoleName = roleName || role_name;
        const targetRoleId = roleId || role_id;
        const targetDepartmentId = departmentId || department_id;
        const targetDepartmentName = departmentName || department;

        // Check if email already exists
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) return errorResponse(res, 'A user with this email already exists.', 400);

        // Check if username already exists
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) return errorResponse(res, 'Username is already taken.', 400);

        let role;
        if (targetRoleId) {
            role = await Role.findById(targetRoleId);
        } else if (targetRoleName) {
            role = await Role.getByName(targetRoleName);
        }

        if (!role) {
            return errorResponse(res, 'A valid system role must be selected.', 400);
        }

        let dept;
        if (targetDepartmentId) {
            dept = await Department.findById(targetDepartmentId);
        } else if (targetDepartmentName) {
            dept = await Department.getByName(targetDepartmentName);
        }

        // Generate a random temporary password if none provided
        const tempPassword = password || Math.random().toString(36).slice(-10);

        // Security: Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        // Generate 6-digit random OTP for first login
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Expiry set to 2 days (48 hours)
        const otpExpiry = new Date();
        otpExpiry.setDate(otpExpiry.getDate() + 2);

        // Create the basic user record
        const newUser = await User.create({
            email,
            username,
            passwordHash,
            roleId: role.id,
            fullName,
            phone,
            departmentId: dept ? dept.id : null,
            location,
            bio,
            isActive: isActive !== undefined ? isActive : true,
            notes,
            otpCode,
            otpExpiry
        });

        // Manually update the object for the API response
        newUser.role_name = role.name;
        if (dept) newUser.department_name = dept.name;

        // Send OTP via real channels
        await sendOTP(newUser, otpCode, tempPassword);

        console.log(`User created: ${email} [TempPass: ${tempPassword}, OTP: ${otpCode}]`);

        await NotificationService.notifyAll(`👤 New User created: ${fullName} (${role.name})`, 'success', req.user ? req.user.fullName : 'System');

        await AuditLog.log({
            userId: req.user ? req.user.id : null,
            action: 'User Creation',
            details: `Created new user ${fullName} with role ${role.name}`,
            actorName: req.user ? req.user.fullName : 'System'
        });

        return successResponse(res, {
            user: newUser,
            otp_sent: true,
            expires_at: otpExpiry,
            temp_password: tempPassword // Include temp password in response for admin
        }, 'User account created and credentials sent to email.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.roleName) {
            const role = await Role.getByName(updateData.roleName);
            if (!role) return errorResponse(res, 'Invalid role.', 400);
            updateData.roleId = role.id;
            delete updateData.roleName;
        }

        if (updateData.departmentName) {
            const dept = await Department.getByName(updateData.departmentName);
            if (!dept) return errorResponse(res, 'Invalid department.', 400);
            updateData.departmentId = dept.id;
            delete updateData.departmentName;
        }

        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.passwordHash = await bcrypt.hash(updateData.password, salt);
            delete updateData.password;
        }

        const updatedUser = await User.update(id, updateData);

        await NotificationService.notifyAll(`👤 User profile updated: ${updatedUser.full_name}`, 'info', req.user ? req.user.fullName : 'System');

        await AuditLog.log({
            userId: req.user ? req.user.id : null,
            action: 'User Update',
            details: `Updated user profile for: ${updatedUser.full_name}`,
            actorName: req.user ? req.user.fullName : 'System'
        });

        return successResponse(res, updatedUser, 'User updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Delete user
 */
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        await User.delete(id);

        if (user) {
            await NotificationService.notifyAll(`🗑️ User removed: ${user.full_name}`, 'warning', req.user ? req.user.fullName : 'System');

            await AuditLog.log({
                userId: req.user ? req.user.id : null,
                action: 'User Deletion',
                details: `Deleted user: ${user.full_name} (${user.email})`,
                actorName: req.user ? req.user.fullName : 'System'
            });
        }

        return successResponse(res, { id }, 'User permanently deleted.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
};
