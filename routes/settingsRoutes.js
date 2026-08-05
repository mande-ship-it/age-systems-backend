const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/settingsController');

const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Config for Profile Pictures
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'profiles');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only images (jpg, jpeg, png) are allowed.'));
    }
});

// 1. Account Settings
router.get('/profile', auth, getAccountProfile);
router.put('/profile', auth, updateAccountProfile);
router.post('/profile/upload', auth, upload.single('profilePicture'), uploadProfilePicture);
router.post('/change-password', auth, changePassword);

// 2. User Preferences (Theme, Language, etc.)
router.get('/preferences', auth, getUserSettings);
router.put('/preferences', auth, updateUserSettings);

// 3. Organisation Profile (Admin Only)
router.get('/organisation', auth, authorize(['Admin', 'Country Director']), getOrganisationProfile);
router.put('/organisation', auth, authorize(['Admin', 'Country Director']), updateOrganisationProfile);

// 4. Backup & Restore (Admin Only)
router.get('/backup', auth, authorize(['Admin']), getBackupInfo);
router.put('/backup/settings', auth, authorize(['Admin']), updateBackupSettings);
router.post('/backup/run', auth, authorize(['Admin']), runBackup);
router.post('/backup/restore', auth, authorize(['Admin']), restoreBackup);

module.exports = router;
