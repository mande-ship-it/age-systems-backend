const { errorResponse } = require('../utils/response');
const User = require('../models/User');

/**
 * Role & Permission-Based Access Control Middleware
 * @param {Array<string>} requirements - List of required roles or permissions
 */
const authorize = (requirements = []) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return errorResponse(res, 'Unauthenticated. User context missing.', 401);
            }

            // Resolve full user with role and permissions
            const user = await User.findById(req.user.id).populate('roleId');
            if (!user || !user.roleId) {
                return errorResponse(res, 'Access Denied. Role not assigned.', 403);
            }

            const userRole = user.roleId.name;
            const userPermissions = user.roleId.permissions || [];

            // 1. Check if user is an Administrator (Super-role bypass)
            if (userRole === 'Administrator') {
                return next();
            }

            // 2. Check if user meets any of the requirements (OR logic)
            const hasRequirement = requirements.some(reqStr =>
                reqStr === userRole || userPermissions.includes(reqStr)
            );

            if (hasRequirement || requirements.length === 0) {
                return next();
            }

            return errorResponse(res, `Forbidden. Insufficient permissions (Required: ${requirements.join(' or ')})`, 403);
        } catch (err) {
            next(err);
        }
    };
};

module.exports = authorize;
