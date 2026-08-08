const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.post('/record', paymentController.recordPayment);
router.get('/scholar/:scholarId', paymentController.getPaymentsByScholar);

module.exports = router;
