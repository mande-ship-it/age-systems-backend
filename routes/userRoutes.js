const express = require('express');
const router = express.Router();

const {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');

const { createUserRules } = require('../validations/userValidation');
const validate = require('../middleware/validationMiddleware');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// User Management (Admin only)
router.get('/', auth, authorize(['Admin', 'Country Director']), getAllUsers);
router.get('/director', async (req, res, next) => {
    try {
        const pool = require('../config/database');
        // Search for user with Director in department or role
        const sql = `
            SELECT u.full_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE LOWER(u.full_name) LIKE '%director%'
               OR LOWER(u.department) LIKE '%director%'
               OR LOWER(r.name) LIKE '%director%'
            ORDER BY
                CASE
                    WHEN LOWER(u.full_name) LIKE '%country director%' THEN 1
                    WHEN LOWER(r.name) LIKE '%country director%' THEN 2
                    ELSE 3
                END ASC, u.id ASC
            LIMIT 1
        `;
        const result = await pool.query(sql);
        const name = result.rowCount > 0 ? result.rows[0].full_name : 'EDWARD YOUNG SHABA'; // Default fallback
        const { successResponse } = require('../utils/response');
        return successResponse(res, { name }, 'Director name retrieved.');
    } catch (err) {
        next(err);
    }
});
router.post('/', auth, authorize(['Admin', 'Country Director']), createUserRules, validate, createUser);
router.put('/:id', auth, authorize(['Admin', 'Country Director']), updateUser);
router.delete('/:id', auth, authorize(['Admin']), deleteUser);

module.exports = router;
