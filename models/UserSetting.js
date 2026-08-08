const mongoose = require('mongoose');

const userSettingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    theme: { type: String, default: 'system' }, // light, dark, system
    notificationsEnabled: { type: Boolean, default: true },
    biometricEnabled: { type: Boolean, default: false },
    language: { type: String, default: 'English (Malawi)' },
    currency: { type: String, default: 'Malawian Kwacha (MWK)' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSettingSchema.virtual('notifications_enabled').get(function() {
    return this.notificationsEnabled;
});

userSettingSchema.virtual('biometric_enabled').get(function() {
    return this.biometricEnabled;
});

module.exports = mongoose.model('UserSetting', userSettingSchema);
