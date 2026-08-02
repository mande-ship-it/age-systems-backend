const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    organization: { type: String },
    email: { type: String, lowercase: true },
    phone: { type: String },
    contactPerson: { type: String },
    sponsorshipType: { type: String, default: 'Standard' }, // Platinum, Gold, Silver, Bronze, In-Kind
    amount: { type: Number, default: 0 },
    registrationDate: { type: Date, default: Date.now },
    address: { type: String },
    notes: { type: String },
    status: { type: String, default: 'Pending' } // Active, Inactive, Pending
}, { timestamps: true });

sponsorSchema.statics.getAll = function() {
    return this.find().sort({ name: 1 });
};

sponsorSchema.statics.getByName = function(name) {
    return this.findOne({ name: new RegExp(`^${name}$`, 'i') });
};

// Virtuals for frontend compatibility (snake_case)
sponsorSchema.virtual('contact_person').get(function() { return this.contactPerson; });
sponsorSchema.virtual('sponsorship_type').get(function() { return this.sponsorshipType; });
sponsorSchema.virtual('registration_date').get(function() { return this.registrationDate; });

sponsorSchema.set('toJSON', { virtuals: true });
sponsorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Sponsor', sponsorSchema);
