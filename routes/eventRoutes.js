const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { eventRules } = require('../validations/eventValidation');
const validate = require('../middleware/validationMiddleware');

const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// All event routes
router.get('/', auth, eventController.getAllEvents);
router.post('/', auth, eventRules, validate, eventController.createEvent);
router.patch('/:id/approve', auth, authorize('Administrator'), eventController.approveEvent);
router.put('/:id', auth, eventRules, validate, eventController.updateEvent);
router.delete('/:id', auth, authorize('Administrator'), eventController.deleteEvent);

module.exports = router;
