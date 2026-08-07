const mongoose = require('mongoose');

const scholarSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scholarId: { type: String, unique: true }, // AGE-001
    fullName: { type: String, required: true },
    email: { type: String },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sponsor' },
    dob: { type: String },
    sex: { type: String, enum: ['Female', 'Male'], default: 'Female' },
    phone: { type: String },
    village: { type: String },
    district: { type: String },
    schoolType: { type: String, enum: ['Secondary', 'University'], required: true },
    schoolName: { type: String },
    previousSchool: { type: String },
    programType: { type: String },
    programName: { type: String },
    startYear: { type: String },
    endYear: { type: String },
    donor: { type: String },
    status: { type: String, default: 'Pending' },
    academicYear: { type: String },
    currentClass: { type: String }, // Should be synced with academicYear
    guardianName: { type: String },
    guardianPhone: { type: String },
    guardianEmail: { type: String },
    guardianRelation: { type: String },
    guardianOccupation: { type: String },

    // Progression & Analytics
    registeredClass: { type: String },
    programStartYearLabel: { type: String },
    programDurationYears: { type: Number, default: 4 },
    yearsCompleted: { type: Number, default: 0 },
    flag: { type: String }, // REPEAT, SUPPLEMENTARY
    progressionHistory: [mongoose.Schema.Types.Mixed],

    profilePicture: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for years remaining
scholarSchema.virtual('yearsRemaining').get(function() {
    const remaining = this.programDurationYears - this.yearsCompleted;
    return remaining > 0 ? remaining : 0;
});

// Virtual for current relative year
scholarSchema.virtual('currentRelativeYear').get(function() {
    return this.yearsCompleted + 1;
});

// Virtual for status display (including flags)
scholarSchema.virtual('displayStatus').get(function() {
    if (this.flag) return `${this.status} (${this.flag})`;
    return this.status;
});

// Auto-generate scholarId
scholarSchema.pre('save', async function() {
    if (this.isNew && !this.scholarId) {
        // Find the last scholar registered
        const lastScholar = await this.constructor.findOne({ scholarId: /^AGE-/ }).sort({ created_at: -1 });
        let nextNumber = 1;
        if (lastScholar && lastScholar.scholarId) {
            const match = lastScholar.scholarId.match(/AGE-(\d+)/);
            if (match) nextNumber = parseInt(match[1]) + 1;
        }
        this.scholarId = `AGE-${nextNumber.toString().padStart(3, '0')}`;
    }

    // Sync currentClass and academicYear
    if (this.currentClass && !this.academicYear) {
        this.academicYear = this.currentClass;
    } else if (this.academicYear && !this.currentClass) {
        this.currentClass = this.academicYear;
    }
});

// Statics
scholarSchema.statics.getById = function(id) {
    return this.findById(id).populate('schoolId sponsorId userId');
};

module.exports = mongoose.model('Scholar', scholarSchema);
