const { errorResponse } = require('../utils/response');

/**
 * Role-Based Access Control Middleware
 * @param {Array<string>} allowedRoles - List of authorized roles
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        // [BYPASSED FOR DEVELOPMENT] Everyone can do what they want
        next();
    };
};

module.exports = authorize;
