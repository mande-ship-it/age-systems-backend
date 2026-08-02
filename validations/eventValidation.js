const { body } = require('express-validator');

const eventRules = [
    body('title').trim().notEmpty().withMessage('Event title is required'),
    body('category').notEmpty().withMessage('Event category is required'),
    body('eventDate')
        .if(body('date').not().exists())
        .isISO8601().withMessage('Valid eventDate is required'),
    body('date')
        .if(body('eventDate').not().exists())
        .isISO8601().withMessage('Valid date is required'),
    body('eventTime')
        .if(body('time').not().exists())
        .notEmpty().withMessage('Event time is required'),
    body('time')
        .if(body('eventTime').not().exists())
        .notEmpty().withMessage('Time is required'),
    body('location').trim().notEmpty().withMessage('Event location is required')
];

module.exports = {
    eventRules
};
