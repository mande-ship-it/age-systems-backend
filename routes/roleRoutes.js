const express = require('express');
const router = express.Router();
const { getAllRoles, createRole, updateRole, deleteRole, updatePermissions } = require('../controllers/roleController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.get('/', auth, authorize(['Administrator', 'Program Manager']), getAllRoles);
router.post('/', auth, authorize(['Administrator']), createRole);
router.put('/:id', auth, authorize(['Administrator']), updateRole);
router.delete('/:id', auth, authorize(['Administrator']), deleteRole);
router.patch('/:id/permissions', auth, authorize(['Administrator']), updatePermissions);

module.exports = router;
