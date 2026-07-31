/**
 * Standard API Response Utilities
 */

/**
 * Send a success response.
 * @param {Object} res - Express response object
 * @param {any} data - Response payload data
 * @param {string} message - Message detail
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

/**
 * Send an error response.
 * @param {Object} res - Express response object
 * @param {string} message - Error explanation
 * @param {number} statusCode - HTTP status code
 * @param {any} errors - Detailed errors object (e.g. validator fields)
 */
const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
    const responsePayload = {
        success: false,
        message
    };
    if (errors) {
        responsePayload.errors = errors;
    }
    return res.status(statusCode).json(responsePayload);
};

module.exports = {
    successResponse,
    errorResponse
};
