const express = require('express');
const router = express.Router();
const { allocateInternship, getAllInternships } = require('../controllers/internshipController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, getAllInternships);
router.post('/allocate', auth, allocateInternship);

module.exports = router;
