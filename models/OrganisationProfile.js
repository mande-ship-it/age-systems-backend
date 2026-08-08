const mongoose = require('mongoose');

const organisationProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    orgId: { type: String, unique: true },
    isVerified: { type: Boolean, default: false },
    createdDate: { type: String }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

organisationProfileSchema.virtual('is_verified').get(function() {
    return this.isVerified;
});

organisationProfileSchema.virtual('org_id').get(function() {
    return this.orgId;
});

organisationProfileSchema.virtual('created_date').get(function() {
    return this.createdDate;
});

module.exports = mongoose.model('OrganisationProfile', organisationProfileSchema);
