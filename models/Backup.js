const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
    label: { type: String, required: true },
    filePath: { type: String },
    fileSize: { type: String }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

backupSchema.virtual('file_size').get(function() {
    return this.fileSize;
});

backupSchema.virtual('created_at').get(function() {
    return this.createdAt;
});

module.exports = mongoose.model('Backup', backupSchema);
