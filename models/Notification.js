const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for broadcast
    message: { type: String, required: true },
    type: { type: String, default: 'info' }, // info, success, warning, error
    actorName: { type: String, default: 'System' },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.statics.getByUser = function(userId) {
    return this.find({
        $or: [{ userId }, { userId: null }]
    }).sort({ createdAt: -1 });
};

// Virtuals for frontend compatibility (PostgreSQL column names)
notificationSchema.virtual('is_read').get(function() {
    return this.isRead;
});

notificationSchema.virtual('actor_name').get(function() {
    return this.actorName;
});

notificationSchema.virtual('created_at').get(function() {
    return this.createdAt;
});

notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
