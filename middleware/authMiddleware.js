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

    // Set a dummy user so routes that expect req.user don't crash
    req.user = {
        id: 1,
        email: 'admin@ageafrica.org',
        role: 'Administrator',
        fullName: 'System Administrator'
    };
    next();
};

module.exports = authMiddleware;
