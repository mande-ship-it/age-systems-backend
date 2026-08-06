const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    isActive: { type: Boolean, default: true },
    isFirstLogin: { type: Boolean, default: true },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    lastLogin: { type: Date },
    assignedDistrict: { type: String },
    profilePicture: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtuals for cleaner UI access
userSchema.virtual('role_name').get(function() {
    return this.roleId ? this.roleId.name : 'User';
});

userSchema.virtual('department_name').get(function() {
    return this.departmentId ? this.departmentId.name : 'Unassigned';
});

module.exports = mongoose.model('User', userSchema);
