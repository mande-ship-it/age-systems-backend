const Department = require('../models/Department');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Get all departments
 */
const getAllDepartments = async (req, res, next) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
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
        const departments = await Department.find().sort({ name: 1 });

        const departmentsWithCounts = await Promise.all(departments.map(async (dept) => {
            const count = await User.countDocuments({ departmentId: dept._id });
            const deptObj = dept.toObject();
            deptObj.userCount = count;
            return deptObj;
        }));

        return successResponse(res, departmentsWithCounts, 'Departments with counts retrieved successfully.');
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
        const users = await User.find({ departmentId: id }).populate('roleId', 'name');
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
        const newDept = new Department({ name, description, code });
        await newDept.save();

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
        const updated = await Department.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return errorResponse(res, 'Department not found.', 404);

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
        if (!dept) return errorResponse(res, 'Department not found.', 404);

        // Check if users are assigned to this department
        const usersInDept = await User.countDocuments({ departmentId: id });
        if (usersInDept > 0) {
            return errorResponse(res, `Cannot delete department. ${usersInDept} users are currently assigned to it.`, 400);
        }

        await Department.findByIdAndDelete(id);

        await NotificationService.notifyAll(`🏢 Department deleted: ${dept.name}`, 'warning', req.user ? req.user.fullName : 'System');

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
