const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventTime: { type: String, required: true },
    location: { type: String, required: true },
    organizer: { type: String },
    targetedParticipants: [String], // Roles or groups
    internalParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    externalParticipants: [{
        name: { type: String },
        email: { type: String, lowercase: true }
    }],
    status: { type: String, default: 'Pending' }, // Pending, Active, History
    completedAt: { type: Date }
}, { timestamps: true });

eventSchema.statics.getAll = function(status = null) {
    const filter = status ? { status } : {};
    return this.find(filter).sort({ eventDate: 1, eventTime: 1 });
};

eventSchema.statics.getEventsInDays = function(days) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    return this.find({
        eventDate: {
            $gte: targetDate,
            $lt: nextDate
        },
        status: 'Active'
    });
};

eventSchema.statics.cleanupHistory = async function() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const expiredEvents = await this.find({
        status: 'History',
        eventDate: { $lt: twoDaysAgo }
    });

    if (expiredEvents.length > 0) {
        await this.deleteMany({
            _id: { $in: expiredEvents.map(e => e._id) }
        });
    }

    return expiredEvents;
};

eventSchema.statics.autoMoveToHistory = async function() {
    const now = new Date();

    // We fetch all active events and manually check if their combined date/time has passed
    const activeEvents = await this.find({ status: 'Active' });
    const pastEvents = [];

    for (const event of activeEvents) {
        const [hours, minutes] = event.eventTime.split(':').map(Number);
        const combinedDateTime = new Date(event.eventDate);
        combinedDateTime.setHours(hours, minutes, 0, 0);

        if (combinedDateTime < now) {
            event.status = 'History';
            event.completedAt = now;
            await event.save();
            pastEvents.push(event);
        }
    }

    return pastEvents;
};

eventSchema.statics.approve = function(id) {
    return this.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
};

eventSchema.statics.delete = function(id) {
    return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Event', eventSchema);
