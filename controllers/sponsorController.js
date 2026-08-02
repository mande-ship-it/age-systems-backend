const Sponsor = require('../models/Sponsor');
const User = require('../models/User');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Register a new sponsor
 */
const createSponsor = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return errorResponse(res, 'Sponsor name and email are mandatory.', 400);
        }

        const existingByName = await Sponsor.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
        if (existingByName) {
            return errorResponse(res, `Partner name "${name}" is already in use.`, 400);
        }

        const existingByEmail = await Sponsor.findOne({ email: email.trim().toLowerCase() });
        if (existingByEmail) {
            return errorResponse(res, `Email address "${email}" is already associated with another partner.`, 400);
        }

        // Clean up data before saving
        const sponsorData = { ...req.body };
        if (sponsorData.email) sponsorData.email = sponsorData.email.trim().toLowerCase();
        if (sponsorData.registrationDate === '') delete sponsorData.registrationDate;

        const sponsor = new Sponsor(sponsorData);

        // If we have a real MongoDB user ID, we can link it
        if (req.user && mongoose.Types.ObjectId.isValid(req.user.id)) {
            sponsor.userId = req.user.id;
        }

        await sponsor.save();

        await NotificationService.notifyAll(`🤝 New Strategic Partner onboarded: ${sponsor.name}`, 'success');

        return successResponse(res, sponsor, 'Partner profile established successfully.', 201);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return errorResponse(res, Object.values(err.errors).map(e => e.message).join(', '), 400);
        }
        next(err);
    }
};

const getAllSponsors = async (req, res, next) => {
    try {
        const sponsors = await Sponsor.find().sort({ name: 1 });
        return successResponse(res, sponsors, 'Sponsors retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

const getSponsorById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sponsor = await Sponsor.findById(id);
        if (!sponsor) return errorResponse(res, 'Sponsor not found.', 404);
        return successResponse(res, sponsor, 'Sponsor details retrieved.');
    } catch (err) {
        next(err);
    }
};

const updateSponsor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid Sponsor ID.', 400);

        // Check duplicates if name/email changed
        if (name) {
            const existingByName = await Sponsor.findOne({
                name: new RegExp(`^${name.trim()}$`, 'i'),
                _id: { $ne: id }
            });
            if (existingByName) return errorResponse(res, `Another partner is already using the name "${name}".`, 400);
        }

        if (email) {
            const existingByEmail = await Sponsor.findOne({
                email: email.trim().toLowerCase(),
                _id: { $ne: id }
            });
            if (existingByEmail) return errorResponse(res, `The email "${email}" is already associated with another partner.`, 400);
        }

        const sponsorData = { ...req.body };
        if (sponsorData.email) sponsorData.email = sponsorData.email.trim().toLowerCase();

        const updated = await Sponsor.findByIdAndUpdate(id, sponsorData, { new: true });
        if (!updated) return errorResponse(res, 'Partner profile not found.', 404);

        await NotificationService.notifyAll(`📝 Partner Profile Updated: ${updated.name}`, 'info');
        return successResponse(res, updated, 'Partner profile updated successfully.');
    } catch (err) {
        if (err.name === 'ValidationError') {
            return errorResponse(res, Object.values(err.errors).map(e => e.message).join(', '), 400);
        }
        next(err);
    }
};

const approveSponsor = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid Sponsor ID.', 400);

        const updated = await Sponsor.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
        if (!updated) return errorResponse(res, 'Sponsor not found.', 404);

        if (updated.userId) {
            await User.findByIdAndUpdate(updated.userId, { isActive: true });
        }

        await NotificationService.notifyAll(`✅ Sponsor approved: ${updated.name}`, 'success');
        return successResponse(res, updated, 'Sponsor approved successfully.');
    } catch (err) {
        next(err);
    }
};

const deleteSponsor = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse(res, 'Invalid Sponsor ID.', 400);

        const sponsor = await Sponsor.findByIdAndDelete(id);
        if (!sponsor) return errorResponse(res, 'Sponsor not found.', 404);

        await NotificationService.notifyAll(`🗑️ Sponsor removed: ${sponsor.name}`, 'warning');
        return successResponse(res, { id }, 'Sponsor deleted successfully.');
    } catch (err) {
        next(err);
    }
};

const getSponsorshipStats = async (req, res, next) => {
    try {
        const total = await Sponsor.countDocuments();
        const funding = await Sponsor.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const tiers = await Sponsor.aggregate([
            { $group: { _id: "$sponsorshipType", count: { $sum: 1 } } }
        ]);

        return successResponse(res, {
            totalSponsors: total,
            totalFunding: funding.length > 0 ? funding[0].total : 0,
            tierDistribution: tiers
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createSponsor,
    getAllSponsors,
    getSponsorById,
    updateSponsor,
    approveSponsor,
    deleteSponsor,
    getSponsorshipStats
};
