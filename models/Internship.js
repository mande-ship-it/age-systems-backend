const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
    scholarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholar', required: true, unique: true },
    workplaceName: { type: String, required: true },
    location: { type: String },
    supervisor: { type: String },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: { type: String, default: 'Active' }, // Active, Completed
    details: { type: String }
}, { timestamps: true });

internshipSchema.statics.getAll = function() {
    return this.find().populate('scholarId').sort({ createdAt: -1 });
};

internshipSchema.statics.autoProcessCompletions = async function() {
    const now = new Date();
    const completions = await this.find({
        status: 'Active',
        endDate: { $lte: now }
    });

    if (completions.length > 0) {
        await this.updateMany(
            { _id: { $in: completions.map(c => c._id) } },
            { status: 'Completed' }
        );
    }

    return completions;
};

// Virtuals for frontend compatibility (snake_case)
internshipSchema.virtual('scholar_name').get(function() {
    return this.scholarId ? (this.scholarId.fullName || this.scholarId.full_name) : 'N/A';
});

internshipSchema.virtual('workplace_name').get(function() {
    return this.workplaceName;
});

internshipSchema.virtual('start_date').get(function() {
    return this.startDate;
});

internshipSchema.virtual('end_date').get(function() {
    return this.endDate;
});

internshipSchema.set('toJSON', { virtuals: true });
internshipSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Internship', internshipSchema);
