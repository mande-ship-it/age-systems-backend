const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { eventRules } = require('../validations/eventValidation');
const validate = require('../middleware/validationMiddleware');

const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// All event routes
router.get('/', eventController.getAllEvents);
router.post('/', eventRules, validate, eventController.createEvent);
router.patch('/:id/approve', auth, authorize('Admin'), eventController.approveEvent);
router.put('/:id', eventRules, validate, eventController.updateEvent);
router.delete('/:id', auth, authorize('Admin'), eventController.deleteEvent);

module.exports = router;
