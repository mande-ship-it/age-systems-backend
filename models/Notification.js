const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If null, it's a broadcast
    message: { type: String, required: true },
    type: { type: String, default: 'info' }, // info, success, warning, error
    actorName: { type: String, default: 'System' },
    isRead: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Notification', notificationSchema);
