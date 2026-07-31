const Department = require('../models/Department');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all departments
 */
const getAllDepartments = async (req, res, next) => {
    try {
        const departments = await Department.getAll();
        return successResponse(res, departments, 'Departments retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get all departments with user counts
 */
const getAllDepartmentsWithCounts = async (req, res, next) => {
    try {
        const departments = await Department.getAllWithCounts();
        return successResponse(res, departments, 'Departments with counts retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get all users in a department
 */
const getDepartmentUsers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const users = await Department.getUsers(id);
        return successResponse(res, users, 'Department users retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new department
 */
const createDepartment = async (req, res, next) => {
    try {
        const { name, description, code } = req.body;
        const newDept = await Department.create({ name, description, code });

        await NotificationService.notifyAll(`🏢 New Department created: ${name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, newDept, 'Department created successfully.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Update department
 */
const updateDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = await Department.update(id, req.body);

        await NotificationService.notifyAll(`🏢 Department updated: ${updated.name}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, updated, 'Department updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Delete department
 */
const deleteDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const dept = await Department.findById(id);
        await Department.delete(id);

        if (dept) {
            await NotificationService.notifyAll(`🏢 Department deleted: ${dept.name}`, 'warning', req.user ? req.user.fullName : 'System');
        }

        return successResponse(res, { id }, 'Department deleted successfully.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllDepartments,
    getAllDepartmentsWithCounts,
    getDepartmentUsers,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
