const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    organization: { type: String },
    email: { type: String },
    phone: { type: String },
    contactPerson: { type: String },
    sponsorshipType: { type: String },
    amount: { type: Number, default: 0 },
    address: { type: String },
    notes: { type: String },
    status: { type: String, default: 'Active' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Sponsor', sponsorSchema);
