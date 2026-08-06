const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, unique: true },
    level: { type: String }, // E.g., Secondary, University
    type: { type: String }, // E.g., Day, Boarding
    genderPolicy: { type: String }, // E.g., Girls Only, Mixed
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
    status: { type: String, default: 'Active' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

schoolSchema.pre('save', async function(next) {
    if (this.isNew && !this.code) {
        const count = await this.constructor.countDocuments();
        this.code = `SCH-${(count + 1).toString().padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('School', schoolSchema);
