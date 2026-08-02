const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    scholarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholar', required: true },
    name: { type: String, required: true },
    path: { type: String, required: true },
    type: { type: String, required: true } // ReportCard, ID, etc.
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
