const express = require('express');
const router = express.Router();

const { 
    createSponsor, 
    getAllSponsors, 
    getSponsorById, 
    updateSponsor,
    approveSponsor,
    deleteSponsor,
    getSponsorshipStats
} = require('../controllers/sponsorController');

const { sponsorRules } = require('../validations/sponsorValidation');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// Sponsorship statistics (Dashboard/Stats Component)
router.get('/stats', auth, getSponsorshipStats);

// Standard Sponsor CRUD
router.get('/', auth, getAllSponsors);
router.get('/:id', auth, getSponsorById);

router.post('/',
    auth,
    authorize(['Admin', 'Country Director']),
    sponsorRules,
    validate,
    createSponsor
);

router.put('/:id',
    auth,
    authorize(['Admin', 'Country Director']),
    sponsorRules,
    validate,
    updateSponsor
);

router.patch('/:id/approve', auth, authorize(['Admin', 'Country Director']), approveSponsor);

router.delete('/:id',
    auth,
    authorize(['Administrator']),
    deleteSponsor
);

module.exports = router;
