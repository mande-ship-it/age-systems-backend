const express = require('express');
const router = express.Router();

const { getDashboardStats, getDistrictsMapData } = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.get('/', auth, getDashboardStats);
router.get('/districts-map', auth, getDistrictsMapData);

module.exports = router;
