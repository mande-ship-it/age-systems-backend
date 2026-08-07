const User = require('../models/User');
const OrganisationProfile = require('../models/OrganisationProfile');
const UserSetting = require('../models/UserSetting');
const Backup = require('../models/Backup');
const BackupSetting = require('../models/BackupSetting');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

const getAccountProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('roleId departmentId');
        if (!user) return errorResponse(res, 'User not found.', 404);
        return successResponse(res, user);
    } catch (err) {
        next(err);
    }
};

const updateAccountProfile = async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.id;
        delete updateData.roleId;
        delete updateData.role_id;
        delete updateData.departmentId;
        delete updateData.department_id;

        const updated = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).populate('roleId departmentId');
        return successResponse(res, updated, 'Profile updated.');
    } catch (err) {
        next(err);
    }
};

const getOrganisationProfile = async (req, res, next) => {
    try {
        let profile = await OrganisationProfile.findOne();
        if (!profile) {
            profile = new OrganisationProfile({ name: 'AGE Africa' });
            await profile.save();
        }
        return successResponse(res, profile);
    } catch (err) {
        next(err);
    }
};

const updateOrganisationProfile = async (req, res, next) => {
    try {
        const updated = await OrganisationProfile.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        await NotificationService.notifyAll('🏢 Organisation updated', 'info');
        return successResponse(res, updated);
    } catch (err) {
        next(err);
    }
};

const getUserSettings = async (req, res, next) => {
    try {
        let settings = await UserSetting.findOne({ userId: req.user.id });
        if (!settings) {
            settings = new UserSetting({ userId: req.user.id });
            await settings.save();
        }
        return successResponse(res, settings);
    } catch (err) {
        next(err);
    }
};

const updateUserSettings = async (req, res, next) => {
    try {
        const updated = await UserSetting.findOneAndUpdate({ userId: req.user.id }, req.body, { new: true, upsert: true });
        return successResponse(res, updated);
    } catch (err) {
        next(err);
    }
};

const getBackupInfo = async (req, res, next) => {
    try {
        const settings = await BackupSetting.findOne() || new BackupSetting();
        const history = await Backup.find().sort({ createdAt: -1 });
        return successResponse(res, { settings, history });
    } catch (err) {
        next(err);
    }
};

const runBackup = async (req, res, next) => {
    try {
        const backup = new Backup({ label: req.body.label || 'Manual', fileSize: '100 KB' });
        await backup.save();
        return successResponse(res, backup, 'Backup done.');
    } catch (err) {
        next(err);
    }
};

const uploadProfilePicture = async (req, res, next) => {
    try {
        if (!req.file) return errorResponse(res, 'No file uploaded.', 400);

        // Normalize path for web: replace backslashes and remove leading ./ or /
        let normalizedPath = req.file.path.replace(/\\/g, '/');
        if (normalizedPath.startsWith('./')) {
            normalizedPath = normalizedPath.substring(2);
        }
        if (normalizedPath.startsWith('/')) {
            normalizedPath = normalizedPath.substring(1);
        }

        const user = await User.findByIdAndUpdate(req.user.id, { profilePicture: normalizedPath }, { new: true });
        return successResponse(res, user, 'Profile picture updated.');
    } catch (err) {
        next(err);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return errorResponse(res, 'User not found.', 404);

        const bcrypt = require('bcrypt');
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) return errorResponse(res, 'Current password is incorrect.', 400);

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(req.user.id, {
            passwordHash,
            isFirstLogin: false // Mark as not first login anymore if they changed it
        });

        await AuditLog.log(req.user.id, 'SECURITY', 'Changed account password');

        return successResponse(res, null, 'Password changed successfully.');
    } catch (err) {
        next(err);
    }
};

const updateBackupSettings = async (req, res, next) => {
    try {
        const updated = await BackupSetting.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        return successResponse(res, updated);
    } catch (err) {
        next(err);
    }
};

const restoreBackup = async (req, res, next) => {
    try {
        return successResponse(res, null, 'Restore initiated.');
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
