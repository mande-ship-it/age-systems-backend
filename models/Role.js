const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String, default: 'person_rounded' },
    color: { type: String, default: '#757575' },
    isSystemRole: { type: Boolean, default: false },
    permissions: [{ type: String }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for user count (optional, can be calculated in controller)
roleSchema.virtual('userCount').get(function() {
    return this._userCount || 0;
});

module.exports = mongoose.model('Role', roleSchema);
