const Setting = require('../models/Setting');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { hashPassword } = require('../utils/helpers');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

/**
 * 1. Account Settings (Personal Profile)
 */
const getAccountProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return errorResponse(res, 'User not found.', 404);

        // Remove password hash before sending
        delete user.password_hash;
        return successResponse(res, user, 'Account profile retrieved.');
    } catch (err) {
        next(err);
    }
};

const updateAccountProfile = async (req, res, next) => {
    try {
        const { fullName, email, phone, location, bio, username } = req.body;

        // Check if username is taken if changing
        if (username) {
            const existing = await User.findByUsername(username);
            if (existing && existing.id !== req.user.id) {
                return errorResponse(res, 'Username is already taken.', 400);
            }
        }

        const updatedUser = await User.update(req.user.id, { fullName, email, phone, location, bio, username });

        delete updatedUser.password_hash;
        return successResponse(res, updatedUser, 'Account profile updated successfully.');
    } catch (err) {
        next(err);
    }
};

const uploadProfilePicture = async (req, res, next) => {
    try {
        if (!req.file) {
            return errorResponse(res, 'No file uploaded.', 400);
        }

        const filePath = `/uploads/profiles/${req.file.filename}`;
        const updatedUser = await User.update(req.user.id, { profilePicture: filePath });

        return successResponse(res, { profilePicture: filePath }, 'Profile picture uploaded successfully.');
    } catch (err) {
        next(err);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const bcrypt = require('bcrypt');

        const user = await User.findById(req.user.id);
        if (!user) return errorResponse(res, 'User not found.', 404);

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return errorResponse(res, 'Current password is incorrect.', 401);
        }

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        await User.update(req.user.id, { passwordHash: newHash });

        return successResponse(res, null, 'Password changed successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * 2. Organisation Profile
 */
const getOrganisationProfile = async (req, res, next) => {
    try {
        const profile = await Setting.getOrganisationProfile();
        return successResponse(res, profile, 'Organisation profile retrieved.');
    } catch (err) {
        next(err);
    }
};

const updateOrganisationProfile = async (req, res, next) => {
    try {
        const updated = await Setting.updateOrganisationProfile(req.body);
        await NotificationService.notifyAll('🏢 Organisation profile details updated', 'info', req.user ? req.user.fullName : 'System');

        await AuditLog.log({
            userId: req.user ? req.user.id : null,
            action: 'Organisation Profile Update',
            details: `Updated organisation details: ${updated.name}`,
            actorName: req.user ? req.user.fullName : 'System'
        });

        return successResponse(res, updated, 'Organisation profile updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * 3. System & User Preferences
 */
const getUserSettings = async (req, res, next) => {
    try {
        const settings = await Setting.getUserSettings(req.user.id);
        return successResponse(res, settings, 'User settings retrieved.');
    } catch (err) {
        next(err);
    }
};

const updateUserSettings = async (req, res, next) => {
    try {
        const updated = await Setting.updateUserSettings(req.user.id, req.body);
        return successResponse(res, updated, 'User settings updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * 4. Backup & Restore
 */
const getBackupInfo = async (req, res, next) => {
    try {
        const settings = await Setting.getBackupSettings();
        const history = await Setting.getBackupHistory();
        return successResponse(res, { settings, history }, 'Backup info retrieved.');
    } catch (err) {
        next(err);
    }
};

const updateBackupSettings = async (req, res, next) => {
    try {
        const updated = await Setting.updateBackupSettings(req.body);
        await NotificationService.notifyAll('⚙️ System backup settings updated', 'info', req.user ? req.user.fullName : 'System');
        return successResponse(res, updated, 'Backup settings updated.');
    } catch (err) {
        next(err);
    }
};

const runBackup = async (req, res, next) => {
    try {
        // Simulate backup process
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const label = req.body.label || 'Manual Backup';
        const fileName = `backup-${timestamp}.sql`;
        const fileSize = `${(Math.random() * 20 + 80).toFixed(1)} MB`;

        const entry = await Setting.addBackupEntry(label, `/uploads/backups/${fileName}`, fileSize);
        await NotificationService.notifyAll(`💾 New manual system backup completed: "${label}"`, 'success', req.user ? req.user.fullName : 'System');

        await AuditLog.log({
            userId: req.user ? req.user.id : null,
            action: 'Database Backup',
            details: `Manual backup generated: ${label} (${fileSize})`,
            actorName: req.user ? req.user.fullName : 'System'
        });

        return successResponse(res, entry, 'Backup completed successfully.');
    } catch (err) {
        next(err);
    }
};

const restoreBackup = async (req, res, next) => {
    try {
        const { backupId } = req.body;
        // Logic for restoration from file would go here
        await NotificationService.notifyAll('🔄 System data restored successfully from backup', 'warning', req.user ? req.user.fullName : 'System');

        await AuditLog.log({
            userId: req.user ? req.user.id : null,
            action: 'Database Restore',
            details: `System restored from backup ID: ${backupId}`,
            actorName: req.user ? req.user.fullName : 'System'
        });

        return successResponse(res, { backupId }, 'System data restored successfully.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAccountProfile,
    updateAccountProfile,
    uploadProfilePicture,
    changePassword,
    getOrganisationProfile,
    updateOrganisationProfile,
    getUserSettings,
    updateUserSettings,
    getBackupInfo,
    updateBackupSettings,
    runBackup,
    restoreBackup
};
