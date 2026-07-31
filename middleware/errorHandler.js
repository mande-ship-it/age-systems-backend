const { errorResponse } = require('../utils/response');

/**
 * Global Error Handling Middleware for Express
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error occurred:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors || null;

    return errorResponse(res, message, statusCode, errors);
};

module.exports = errorHandler;
