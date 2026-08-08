const mongoose = require('mongoose');

const backupSettingSchema = new mongoose.Schema({
    autoBackupEnabled: { type: Boolean, default: true },
    frequency: { type: String, default: 'Daily' }, // Hourly, Daily, Weekly, Monthly
    wifiOnly: { type: Boolean, default: true },
    lastBackupAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

backupSettingSchema.virtual('auto_backup_enabled').get(function() {
    return this.autoBackupEnabled;
});

backupSettingSchema.virtual('wifi_only').get(function() {
    return this.wifiOnly;
});

backupSettingSchema.virtual('last_backup_at').get(function() {
    return this.lastBackupAt;
});

module.exports = mongoose.model('BackupSetting', backupSettingSchema);
