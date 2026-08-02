const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String },
    actorName: { type: String, default: 'System' }
}, { timestamps: true });

auditLogSchema.statics.getAll = function() {
    return this.find().populate('userId').sort({ createdAt: -1 });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
