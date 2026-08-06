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

eventSchema.statics.approve = function(id) {
    return this.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
};

eventSchema.statics.delete = function(id) {
    return this.findByIdAndDelete(id);
};

module.exports = mongoose.model('Event', eventSchema);
