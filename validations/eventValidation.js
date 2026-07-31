const { body } = require('express-validator');

const eventRules = [
    body('title').trim().notEmpty().withMessage('Event title is required'),
    body('category').notEmpty().withMessage('Event category is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('time').notEmpty().withMessage('Event time is required'),
    body('location').trim().notEmpty().withMessage('Event location is required')
];

module.exports = {
    eventRules
};
