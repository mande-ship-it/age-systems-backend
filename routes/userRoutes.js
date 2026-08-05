const express = require('express');
const router = express.Router();

const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getDirector,
    getActiveUsers
} = require('../controllers/userController');

const { createUserRules } = require('../validations/userValidation');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// User Management (Admin only)
router.get('/', auth, authorize(['Admin', 'Country Director']), getAllUsers);
router.get('/active', auth, authorize(['Admin', 'Country Director']), getActiveUsers);
router.get('/director', getDirector);
router.get('/:id', auth, authorize(['Admin', 'Country Director']), getUserById);
router.post('/', auth, authorize(['Admin', 'Country Director']), createUserRules, validate, createUser);
router.put('/:id', auth, authorize(['Admin', 'Country Director']), updateUser);
router.delete('/:id', auth, authorize(['Admin']), deleteUser);

module.exports = router;
