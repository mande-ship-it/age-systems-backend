const Role = require('../models/Role');
const User = require('../models/User');
const { PERMISSION_GROUPS } = require('../utils/permissions');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all roles with user counts
 */
const getAllRoles = async (req, res, next) => {
    try {
        console.log('GET /api/roles - Fetching all roles...');
        const roles = await Role.find().sort({ name: 1 });

        // Calculate user counts for each role
        const rolesWithCounts = await Promise.all(roles.map(async (role) => {
            const count = await User.countDocuments({ roleId: role._id });
            const roleObj = role.toObject();
            roleObj.userCount = count;
            return roleObj;
        }));

        console.log(`Successfully fetched ${roles.length} roles.`);
        return successResponse(res, rolesWithCounts, 'Roles retrieved successfully.');
    } catch (err) {
        console.error('Error in getAllRoles:', err);
        next(err);
    }
};

/**
 * Get all available permission groups
 */
const getPermissionGroups = async (req, res, next) => {
    try {
        return successResponse(res, PERMISSION_GROUPS, 'Permission groups retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new role
 */
const createRole = async (req, res, next) => {
    try {
        const { name, description, icon, color, permissions } = req.body;
        console.log('🛡️ Attempting to create role:', { name });

        const existing = await Role.findOne({ name });
        if (existing) {
            return errorResponse(res, 'Role with this name already exists.', 400);
        }

        const role = new Role({ name, description, icon, color, permissions });
        await role.save();
        console.log('✅ Role created successfully:', role._id);

        await NotificationService.notifyAll(`🛡️ New Role created: ${name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, role, 'Role created successfully.', 201);
    } catch (err) {
        console.error('❌ createRole error:', err);
        next(err);
    }
};

/**
 * Update role
 */
const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await Role.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return errorResponse(res, 'Role not found.', 404);

        await NotificationService.notifyAll(`🛡️ Role updated: ${updated.name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, updated, 'Role updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Delete role
 */
const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const role = await Role.findById(id);
        if (!role) return errorResponse(res, 'Role not found.', 404);

        if (role.isSystemRole) {
            return errorResponse(res, 'System roles cannot be deleted.', 400);
        }

        // Check if users are assigned to this role
        const usersInRole = await User.countDocuments({ roleId: id });
        if (usersInRole > 0) {
            return errorResponse(res, `Cannot delete role. ${usersInRole} users are currently assigned to it.`, 400);
        }

        await Role.findByIdAndDelete(id);

        await NotificationService.notifyAll(`🛡️ Role deleted: ${role.name}`, 'warning', req.user ? req.user.fullName : 'System');

        return successResponse(res, { id }, 'Role deleted successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Update Permissions for a role
 */
const updatePermissions = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        const updated = await Role.findByIdAndUpdate(id, { permissions }, { new: true });
        if (!updated) return errorResponse(res, 'Role not found.', 404);

        await NotificationService.notifyAll(`🛡️ Permissions updated for role: ${updated.name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, updated, 'Permissions updated successfully.');
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAllRoles,
    getPermissionGroups,
    createRole,
    updateRole,
    deleteRole,
    updatePermissions
};
