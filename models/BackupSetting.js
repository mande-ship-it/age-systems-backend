const mongoose = require('mongoose');

const backupSettingSchema = new mongoose.Schema({
    autoBackupEnabled: { type: Boolean, default: true },
    frequency: { type: String, default: 'Daily' }, // Hourly, Daily, Weekly, Monthly
    wifiOnly: { type: Boolean, default: true },
    lastBackupAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('BackupSetting', backupSettingSchema);
