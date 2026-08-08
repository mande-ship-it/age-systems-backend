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
router.get('/', auth, authorize(['Administrator', 'Country Director']), getAllUsers);
router.get('/active', auth, authorize(['Administrator', 'Country Director']), getActiveUsers);
router.get('/director', getDirector);
router.get('/:id', auth, authorize(['Administrator', 'Country Director']), getUserById);
router.post('/', auth, authorize(['Administrator', 'Country Director']), createUserRules, validate, createUser);
router.put('/:id', auth, authorize(['Administrator', 'Country Director']), updateUser);
router.delete('/:id', auth, authorize(['Administrator']), deleteUser);

module.exports = router;
