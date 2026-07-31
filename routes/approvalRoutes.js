const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// All approval routes require authentication and specific roles
router.use(auth);
router.use(authorize(['Administrator', 'Program Coordinator', 'Country Director']));

router.get('/pending', approvalController.getPendingActivities);
router.patch('/approve/:type/:id', approvalController.approveActivity);
router.delete('/reject/:type/:id', approvalController.rejectActivity);

module.exports = router;
