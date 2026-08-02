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
}, { timestamps: true });

module.exports = mongoose.model('OrganisationProfile', organisationProfileSchema);
