const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String }, // E.g., CHATS, Workshop, Graduation
    eventDate: { type: Date, required: true },
    eventTime: { type: String }, // E.g., "10:00 AM"
    location: { type: String },
    organizer: { type: String },
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

module.exports = mongoose.model('Event', eventSchema);
