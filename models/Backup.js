const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
    label: { type: String, required: true },
    filePath: { type: String },
    fileSize: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Backup', backupSchema);
