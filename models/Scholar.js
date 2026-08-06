const mongoose = require('mongoose');

const scholarSchema = new mongoose.Schema({
    scholarId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sponsor' },
    fullName: { type: String, required: true },
    email: { type: String, lowercase: true },
    dob: { type: Date, required: true },
    sex: { type: String },
    phone: { type: String },
    village: { type: String },
    district: { type: String },
    schoolType: { type: String }, // Secondary, University
    schoolName: { type: String }, // Fallback if schoolId is null
    previousSchool: { type: String },
    programType: { type: String }, // Degree, Diploma, Certificate
    programName: { type: String }, // e.g., BSc Computer Science
    startYear: { type: String }, // Calendar year (e.g. 2023)
    endYear: { type: String },   // Calendar year (e.g. 2027)

    // --- Progression Logic Fields (Spec Section 1) ---
    registeredClass: { type: String },      // e.g. "Form 1" or "Year 1"
    programStartYearLabel: { type: String }, // The literal label they started with (doesn't change)
    programDurationYears: { type: Number, default: 4 },
    yearsCompleted: { type: Number, default: 0 },
    flag: { type: String, enum: [null, 'REPEAT', 'SUPPLEMENTARY'], default: null },
    // --------------------------------------------------

    donor: { type: String },
    status: { type: String, default: 'Pending' }, // Pending, Active, Graduated, Suspended, Completed, Awaiting Allocation, Alumni
    academicYear: { type: String }, // Current literal label (Form 3, etc)
    currentClass: { type: String }, // Alias for academicYear

    guardianName: { type: String },
    guardianPhone: { type: String },
    guardianEmail: { type: String },
    guardianRelation: { type: String },
    guardianOccupation: { type: String },
    progressionStatus: { type: String, default: 'Pending' }, // Moved, Failed, Pending
    progressionHistory: [{
        year: Number,
        average: Number,
        result: String,
        from_class: String,
        to_class: String,
        date: { type: Date, default: Date.now },
        ai_insight: String
    }]
}, { timestamps: true });

// Pre-validate hook to generate scholarId if missing and sync academic fields
scholarSchema.pre('validate', async function() {
    if (!this.scholarId) {
        const latest = await this.constructor.findOne({ scholarId: /^AGE-\d+$/ })
            .sort({ scholarId: -1 });
        let nextNum = 1;
        if (latest && latest.scholarId) {
            const match = latest.scholarId.match(/^AGE-(\d+)$/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }
        this.scholarId = `AGE-${nextNum.toString().padStart(3, '0')}`;
    }

    // Set baseline progression fields if this is a new scholar (Spec Section 1)
    if (this.isNew) {
        if (!this.registeredClass && (this.academicYear || this.currentClass)) {
            this.registeredClass = this.academicYear || this.currentClass;
        }
        if (!this.programStartYearLabel) {
            this.programStartYearLabel = this.registeredClass || this.academicYear || this.currentClass;
        }
    }

    // Sync academicYear and currentClass
    if (this.currentClass && !this.academicYear) {
        this.academicYear = this.currentClass;
    } else if (this.academicYear && !this.currentClass) {
        this.currentClass = this.academicYear;
    }
});

// Virtuals for derived data (Spec Section 2)
scholarSchema.virtual('yearsRemaining').get(function() {
    const remaining = this.programDurationYears - this.yearsCompleted;
    return remaining > 0 ? remaining : 0;
});

scholarSchema.virtual('currentRelativeYear').get(function() {
    return this.yearsCompleted + 1;
});

// Virtuals for derived data and frontend compatibility
scholarSchema.virtual('full_name').get(function() {
    return this.fullName;
});

scholarSchema.virtual('scholar_id').get(function() {
    return this.scholarId;
});

scholarSchema.virtual('display_school_name').get(function() {
    if (this.schoolId && this.schoolId.name) return this.schoolId.name;
    return this.schoolName || 'N/A';
});

scholarSchema.virtual('school_type').get(function() { return this.schoolType; });
scholarSchema.virtual('academic_year').get(function() { return this.academicYear; });
scholarSchema.virtual('current_class').get(function() { return this.currentClass; });
scholarSchema.virtual('registered_class').get(function() { return this.registeredClass; });
scholarSchema.virtual('program_start_year_label').get(function() { return this.programStartYearLabel; });
scholarSchema.virtual('program_duration_years').get(function() { return this.programDurationYears; });
scholarSchema.virtual('years_completed').get(function() { return this.yearsCompleted; });
scholarSchema.virtual('years_remaining').get(function() { return this.yearsRemaining; });
scholarSchema.virtual('program_type').get(function() { return this.programType; });
scholarSchema.virtual('program_name').get(function() { return this.programName; });
scholarSchema.virtual('previous_school').get(function() { return this.previousSchool; });
scholarSchema.virtual('start_year').get(function() { return this.startYear; });
scholarSchema.virtual('end_year').get(function() { return this.endYear; });
scholarSchema.virtual('guardian_name').get(function() { return this.guardianName; });
scholarSchema.virtual('guardian_phone').get(function() { return this.guardianPhone; });
scholarSchema.virtual('guardian_email').get(function() { return this.guardianEmail; });
scholarSchema.virtual('guardian_relation').get(function() { return this.guardianRelation; });
scholarSchema.virtual('guardian_occupation').get(function() { return this.guardianOccupation; });
scholarSchema.virtual('program_name').get(function() { return this.programName; });
scholarSchema.virtual('previous_school').get(function() { return this.previousSchool; });
scholarSchema.virtual('start_year').get(function() { return this.startYear; });
scholarSchema.virtual('end_year').get(function() { return this.endYear; });
scholarSchema.virtual('guardian_name').get(function() { return this.guardianName; });
scholarSchema.virtual('guardian_phone').get(function() { return this.guardianPhone; });
scholarSchema.virtual('guardian_email').get(function() { return this.guardianEmail; });
scholarSchema.virtual('guardian_relation').get(function() { return this.guardianRelation; });
scholarSchema.virtual('guardian_occupation').get(function() { return this.guardianOccupation; });
scholarSchema.virtual('progression_status').get(function() { return this.progressionStatus; });
scholarSchema.virtual('progression_history').get(function() { return this.progressionHistory; });

scholarSchema.virtual('internship_status').get(function() {
    return this.status === 'Alumni' ? 'Allocated' : null;
});

scholarSchema.statics.getAll = function() {
    return this.find().populate('schoolId sponsorId userId').sort({ fullName: 1 });
};

scholarSchema.statics.getById = function(id) {
    if (mongoose.Types.ObjectId.isValid(id)) {
        return this.findOne({ _id: id }).populate('schoolId sponsorId userId');
    }
    return this.findOne({ scholarId: id }).populate('schoolId sponsorId userId');
};

scholarSchema.statics.findByUserId = function(userId) {
    return this.findOne({ userId }).populate('schoolId sponsorId userId');
};

scholarSchema.statics.autoTransitionGraduates = async function() {
    const currentYear = new Date().getFullYear();
    const graduates = await this.find({
        status: 'Active',
        endYear: { $lte: currentYear.toString() }
    });

    if (graduates.length > 0) {
        await this.updateMany(
            { _id: { $in: graduates.map(g => g._id) } },
            { status: 'Graduated' }
        );
    }

    return graduates;
};

scholarSchema.set('toJSON', { virtuals: true });
scholarSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Scholar', scholarSchema);
