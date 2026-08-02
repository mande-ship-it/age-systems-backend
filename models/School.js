const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, unique: true }, // Removed required: true as it's auto-generated
    level: { type: String, required: true }, // Primary, Secondary, Tertiary, etc.
    type: { type: String, required: true }, // Public, Private, etc.
    genderPolicy: { type: String }, // Mixed, Boys, Girls
    region: { type: String },
    district: { type: String },
    address: { type: String },
    postalAddress: { type: String },
    phone: { type: String },
    altPhone: { type: String },
    email: { type: String },
    website: { type: String },
    adminName: { type: String },
    adminRole: { type: String },
    adminPhone: { type: String },
    adminEmail: { type: String },
    description: { type: String },
    notes: { type: String },
    status: { type: String, default: 'Active' }
}, { timestamps: true });

// Pre-validate hook to generate code if missing
schoolSchema.pre('validate', async function() {
    if (!this.code) {
        const count = await this.constructor.countDocuments();
        this.code = `SCH-${(count + 1).toString().padStart(3, '0')}`;
    }
});

schoolSchema.statics.getAll = function() {
    return this.find().sort({ name: 1 });
};

// Virtuals for frontend compatibility (snake_case)
schoolSchema.virtual('gender_policy').get(function() { return this.genderPolicy; });
schoolSchema.virtual('postal_address').get(function() { return this.postalAddress; });
schoolSchema.virtual('alt_phone').get(function() { return this.altPhone; });
schoolSchema.virtual('admin_name').get(function() { return this.adminName; });
schoolSchema.virtual('admin_role').get(function() { return this.adminRole; });
schoolSchema.virtual('admin_phone').get(function() { return this.adminPhone; });
schoolSchema.virtual('admin_email').get(function() { return this.adminEmail; });

schoolSchema.set('toJSON', { virtuals: true });
schoolSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('School', schoolSchema);
