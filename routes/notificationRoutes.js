const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/response');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, async (req, res, next) => {
    try {
        const notifications = await Notification.find({
            $or: [{ userId: req.user.id }, { userId: null }]
        }).sort({ createdAt: -1 });
        return successResponse(res, notifications);
    } catch (err) {
        next(err);
    }
});

router.get('/recent', auth, async (req, res, next) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(10);
        return successResponse(res, logs);
    } catch (err) {
        next(err);
    }
});

router.patch('/:id/read', auth, async (req, res, next) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
        if (!notification) return errorResponse(res, 'Notification not found.', 404);
        return successResponse(res, notification);
    } catch (err) {
        next(err);
    }
});

router.patch('/read-all', auth, async (req, res, next) => {
    try {
        await Notification.updateMany({ $or: [{ userId: req.user.id }, { userId: null }] }, { isRead: true });
        return successResponse(res, null, 'All marked as read.');
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', auth, async (req, res, next) => {
    try {
        const deleted = await Notification.findByIdAndDelete(req.params.id);
        if (!deleted) return errorResponse(res, 'Notification not found.', 404);
        return successResponse(res, { id: req.params.id });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
