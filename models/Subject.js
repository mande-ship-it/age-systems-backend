const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, unique: true, required: true },
    level: { type: String, required: true }, // Secondary, University
    details: { type: String },
    notes: { type: String }
}, { timestamps: true });

subjectSchema.statics.getAll = function(level = null) {
    const filter = level ? { level } : {};
    return this.find(filter).sort({ name: 1 });
};

module.exports = mongoose.model('Subject', subjectSchema);
