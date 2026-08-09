const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, meetingController.createMeeting);
router.get('/my', auth, meetingController.getMyMeetings);
router.get('/:id', auth, meetingController.getMeetingById);

module.exports = router;
