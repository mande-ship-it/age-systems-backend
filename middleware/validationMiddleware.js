const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to handle express-validator output
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ Validation Failed:', errors.array().map(e => `${e.path}: ${e.msg}`).join(', '));
        return errorResponse(res, errors.array()[0].msg, 400, errors.array());
    }
    next();
};

module.exports = validate;
