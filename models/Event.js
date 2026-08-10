const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String }, // E.g., CHATS, Workshop, Graduation
    eventDate: { type: Date, required: true },
    eventTime: { type: String }, // E.g., "10:00 AM"
    location: { type: String },
    organizer: { type: String },
    attendees: [{
        participantId: { type: mongoose.Schema.Types.ObjectId, refPath: 'attendees.participantType' },
        participantType: { type: String, enum: ['Scholar', 'User'] }
    }],
    targetedParticipants: [{ type: String }],
    status: { type: String, default: 'Pending' }, // Pending, Active, History
    completed_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Statics
eventSchema.statics.getEventsInDays = function(days) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.find({
        status: 'Active',
        eventDate: { $gte: targetDate, $lt: nextDay }
    });
};

eventSchema.statics.autoMoveToHistory = async function() {
    const now = new Date();
    // Find active events where eventDate has passed
    const expired = await this.find({
        status: 'Active',
        eventDate: { $lt: now }
    });

    if (expired.length > 0) {
        await this.updateMany(
            { _id: { $in: expired.map(e => e._id) } },
            { status: 'History' }
        );
    }
    return expired;
};

eventSchema.statics.cleanupHistory = async function() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 2); // Older than 2 days

    const oldEvents = await this.find({
        status: 'History',
        eventDate: { $lt: threshold }
    });

    if (oldEvents.length > 0) {
        await this.deleteMany({ _id: { $in: oldEvents.map(e => e._id) } });
    }
    return oldEvents;
};

module.exports = mongoose.model('Event', eventSchema);
