const Role = require('../models/Role');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all roles
 */
const getAllRoles = async (req, res, next) => {
    try {
        console.log('GET /api/roles - Fetching all roles...');
        const roles = await Role.getAll();
        console.log(`Successfully fetched ${roles.length} roles.`);
        return successResponse(res, roles, 'Roles retrieved successfully.');
    } catch (err) {
        console.error('Error in getAllRoles:', err);
        next(err);
    }
};

/**
 * Create a new role
 */
const createRole = async (req, res, next) => {
    try {
        const { name, description, icon, color, permissions } = req.body;
        const newRole = await Role.create({ name, description, icon, color, permissions });

        await NotificationService.notifyAll(`🛡️ New Role created: ${name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, newRole, 'Role created successfully.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Update role
 */
const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await Role.update(id, req.body);

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
        await Role.delete(id);

        if (role) {
            await NotificationService.notifyAll(`🛡️ Role deleted: ${role.name}`, 'warning', req.user ? req.user.fullName : 'System');
        }

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

        const role = await Role.findById(id);
        if (!role) return errorResponse(res, 'Role not found.', 404);

        const updated = await Role.updatePermissions(id, permissions);

        await NotificationService.notifyAll(`🛡️ Permissions updated for role: ${role.name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, updated, 'Permissions updated successfully.');
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
    updatePermissions
};
