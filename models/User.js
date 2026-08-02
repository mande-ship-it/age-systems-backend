const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true, lowercase: true },
    username: { type: String, unique: true, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    fullName: { type: String, required: true },
    phone: { type: String },
    location: { type: String },
    bio: { type: String },
    profilePicture: { type: String },
    isActive: { type: Boolean, default: true },
    isFirstLogin: { type: Boolean, default: true },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    lastLogin: { type: Date },
    notes: { type: String }
}, { timestamps: true });

// Static methods for compatibility
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() }).populate('roleId departmentId');
};

userSchema.statics.findById = function(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return this.findOne({ _id: id }).populate('roleId departmentId');
};

userSchema.statics.getAll = function() {
    return this.find().populate('roleId departmentId').sort({ createdAt: -1 });
};

// Aliasing for old controller calls that expect camelCase or certain structure
userSchema.virtual('role_name').get(function() {
    return this.roleId ? this.roleId.name : 'User';
});

userSchema.virtual('department_name').get(function() {
    return this.departmentId ? this.departmentId.name : null;
});

userSchema.virtual('full_name').get(function() {
    return this.fullName;
});

userSchema.virtual('is_active').get(function() {
    return this.isActive;
});

userSchema.virtual('created_at').get(function() {
    return this.createdAt;
});

userSchema.virtual('last_login').get(function() {
    return this.lastLogin;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
