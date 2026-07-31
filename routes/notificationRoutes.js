const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/response');
const auth = require('../middleware/authMiddleware');

// Get all notifications for a user
router.get('/', auth, async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : 1;
        const notifications = await Notification.getByUser(userId);
        return successResponse(res, notifications, 'Notifications retrieved.');
    } catch (err) {
        next(err);
    }
});

// Get recent system activities (Audit Logs) for admin dashboard
router.get('/recent', auth, async (req, res, next) => {
    try {
        // Limit to 10 most recent activities for dashboard performance
        const sql = `
            SELECT
                action as message,
                actor_name as actor,
                created_at,
                details
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 10
        `;
        const { rows } = await require('../config/database').query(sql);
        return successResponse(res, rows, 'Recent system activities retrieved.');
    } catch (err) {
        next(err);
    }
});

// Mark as read
router.patch('/:id/read', auth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const notification = await Notification.markAsRead(id);
        if (!notification) return errorResponse(res, 'Notification not found.', 404);
        return successResponse(res, notification, 'Notification marked as read.');
    } catch (err) {
        next(err);
    }
});

// Mark all as read
router.patch('/read-all', auth, async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : 1;
        const result = await Notification.markAllAsRead(userId);
        return successResponse(res, result, 'All notifications marked as read.');
    } catch (err) {
        next(err);
    }
});

// Delete notification
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await Notification.delete(id);
        if (!deleted) return errorResponse(res, 'Notification not found.', 404);
        return successResponse(res, { id }, 'Notification deleted.');
    } catch (err) {
        next(err);
    }
});

module.exports = router;
