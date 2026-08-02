const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    description: { type: String },
    icon: { type: String, default: 'person' },
    color: { type: String, default: '#4C3C32' },
    permissions: [String],
    isSystemRole: { type: Boolean, default: false }
}, { timestamps: true });

// Static methods for compatibility with old controller calls
roleSchema.statics.getByName = function(name) {
    return this.findOne({ name });
};

roleSchema.statics.getAll = async function() {
    const roles = await this.find().sort({ name: 1 });
    const User = mongoose.model('User');

    return Promise.all(roles.map(async (role) => {
        const count = await User.countDocuments({ roleId: role._id });
        return {
            ...role.toObject(),
            user_count: count,
            userCount: count,
            created_at: role.createdAt
        };
    }));
};

roleSchema.statics.update = function(id, data) {
    return this.findByIdAndUpdate(id, data, { new: true });
};

roleSchema.statics.delete = function(id) {
    return this.findByIdAndDelete(id);
};

roleSchema.statics.updatePermissions = function(id, permissions) {
    if (!Array.isArray(permissions)) {
        // If it's the old object format, we might need to convert it or just reject it
        // For now, let's assume we are moving to the array of strings format
        return this.findByIdAndUpdate(id, { permissions: [] }, { new: true });
    }
    return this.findByIdAndUpdate(id, { permissions }, { new: true });
};

// Virtuals for frontend compatibility
roleSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

roleSchema.set('toJSON', { virtuals: true });
roleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Role', roleSchema);
