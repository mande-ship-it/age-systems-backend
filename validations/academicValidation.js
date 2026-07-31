const { body } = require('express-validator');

const recordResultsRules = [
    body('results').isArray({ min: 1 }).withMessage('At least one result record is required'),
    body('results.*.subjectName').trim().notEmpty().withMessage('Subject name is required'),
    body('results.*.marks').isFloat({ min: 0, max: 100 }).withMessage('Marks must be between 0 and 100'),
    body('year').isInt().withMessage('Valid year is required'),
    body('schoolType').isIn(['Secondary', 'University']).withMessage('School type must be Secondary or University')
];

const createSubjectRules = [
    body('name').trim().notEmpty().withMessage('Subject name is required'),
    body('code').trim().notEmpty().withMessage('Subject code is required'),
    body('level').isIn(['Secondary', 'University']).withMessage('Level must be Secondary or University')
];

module.exports = {
    recordResultsRules,
    createSubjectRules
};
