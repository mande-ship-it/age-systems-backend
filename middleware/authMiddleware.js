const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const Role = require('../models/Role');
const User = require('../models/User');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (!decoded) {
            return errorResponse(res, 'Invalid or expired token.', 401);
        }
        req.user = decoded;
        return next();
    }

    return errorResponse(res, 'Access denied. No token provided.', 401);
};

module.exports = authMiddleware;
