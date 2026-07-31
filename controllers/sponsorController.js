const Sponsor = require('../models/Sponsor');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * Register a new sponsor
 */
const createSponsor = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        // Check if sponsor already exists by name or email
        const existingByName = await Sponsor.getByName(name);
        if (existingByName) {
            return errorResponse(res, `A sponsor with the name "${name}" is already registered.`, 400);
        }

        const existingByEmail = await Sponsor.getByEmail(email);
        if (existingByEmail) {
            return errorResponse(res, `A sponsor with the email "${email}" is already registered.`, 400);
        }

        const sponsor = await Sponsor.create(req.body);

        await NotificationService.notifyAll(`🤝 New Sponsor registered: ${sponsor.name}`, 'success', req.user ? req.user.fullName : 'System');

        return successResponse(res, sponsor, 'Sponsor registered successfully.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Get all sponsors
 */
const getAllSponsors = async (req, res, next) => {
    try {
        const sponsors = await Sponsor.getAll();
        return successResponse(res, sponsors, 'Sponsors retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get sponsor by ID
 */
const getSponsorById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sponsor = await Sponsor.findById(id);
        if (!sponsor) {
            return errorResponse(res, 'Sponsor not found.', 404);
        }
        return successResponse(res, sponsor, 'Sponsor details retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * Update sponsor details
 */
const updateSponsor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sponsor = await Sponsor.findById(id);
        if (!sponsor) {
            return errorResponse(res, 'Sponsor not found.', 404);
        }

        const updated = await Sponsor.update(id, req.body);
        await NotificationService.notifyAll(`📝 Sponsor updated: ${updated.name}`, 'info', req.user ? req.user.fullName : 'System');
        return successResponse(res, updated, 'Sponsor updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Approve a sponsor
 */
const approveSponsor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sponsor = await Sponsor.findById(id);
        if (!sponsor) {
            return errorResponse(res, 'Sponsor not found.', 404);
        }

        const approved = await Sponsor.approve(id);

        // Activate associated user account if it exists
        if (approved.user_id) {
            await User.update(approved.user_id, { isActive: true });
        }

        await NotificationService.notifyAll(`✅ Sponsor approved: ${approved.name}`, 'success', req.user ? req.user.fullName : 'System');

        return successResponse(res, approved, 'Sponsor approved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a sponsor
 */
const deleteSponsor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sponsor = await Sponsor.findById(id);
        if (!sponsor) {
            return errorResponse(res, 'Sponsor not found.', 404);
        }

        await Sponsor.delete(id);
        await NotificationService.notifyAll(`🗑️ Sponsor removed: ${sponsor.name}`, 'warning', req.user ? req.user.fullName : 'System');
        return successResponse(res, { id }, 'Sponsor deleted successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Get sponsorship statistics for the dashboard/stats component
 */
const getSponsorshipStats = async (req, res, next) => {
    try {
        const stats = await Sponsor.getStats();
        return successResponse(res, stats, 'Sponsorship statistics retrieved.');
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
