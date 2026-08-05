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
    startYear: { type: String },
    endYear: { type: String },
    donor: { type: String },
    status: { type: String, default: 'Pending' }, // Pending, Active, Inactive, Graduated, Suspended, Completed, Alumni
    academicYear: { type: String }, // e.g., Form 3, Year 2
    currentClass: { type: String }, // Alias for academicYear for frontend compatibility
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

    // Sync academicYear and currentClass
    if (this.currentClass && !this.academicYear) {
        this.academicYear = this.currentClass;
    } else if (this.academicYear && !this.currentClass) {
        this.currentClass = this.academicYear;
    }
});

// Virtuals for derived data and frontend compatibility
scholarSchema.virtual('full_name').get(function() {
    return this.fullName;
});

scholarSchema.virtual('scholar_id').get(function() {
    return this.scholarId;
});

scholarSchema.virtual('academic_year').get(function() {
    return this.academicYear || this.currentClass;
});

scholarSchema.virtual('display_school_name').get(function() {
    if (this.schoolId && this.schoolId.name) return this.schoolId.name;
    return this.schoolName || 'N/A';
});

scholarSchema.virtual('school_type').get(function() {
    return this.schoolType;
});

scholarSchema.virtual('program_type').get(function() {
    return this.programType;
});

scholarSchema.virtual('program_name').get(function() {
    return this.programName;
});

scholarSchema.virtual('previous_school').get(function() {
    return this.previousSchool;
});

scholarSchema.virtual('start_year').get(function() {
    return this.startYear;
});

scholarSchema.virtual('end_year').get(function() {
    return this.endYear;
});

scholarSchema.virtual('guardian_name').get(function() {
    return this.guardianName;
});

scholarSchema.virtual('guardian_phone').get(function() {
    return this.guardianPhone;
});

scholarSchema.virtual('guardian_email').get(function() {
    return this.guardianEmail;
});

scholarSchema.virtual('guardian_relation').get(function() {
    return this.guardianRelation;
});

scholarSchema.virtual('guardian_occupation').get(function() {
    return this.guardianOccupation;
});

scholarSchema.virtual('progression_status').get(function() {
    return this.progressionStatus;
});

scholarSchema.virtual('progression_history').get(function() {
    return this.progressionHistory;
});

scholarSchema.virtual('internship_status').get(function() {
    return this.status === 'Alumni' ? 'Allocated' : null;
});

scholarSchema.virtual('yearsRemaining').get(function() {
    if (this.status === 'Graduated' || this.status === 'Alumni' || this.status === 'Completed') return 0;

    const end = parseInt(this.endYear);
    if (isNaN(end)) return 0;

    const currentYear = new Date().getFullYear();

    // Remaining = (End Year - Current Year) + 1
    // This tracks the actual calendar years left in the program cycle
    const remaining = (end - currentYear) + 1;
    return remaining > 0 ? remaining : 0;
});

scholarSchema.virtual('years_remaining').get(function() {
    if (this.status === 'Graduated' || this.status === 'Alumni' || this.status === 'Completed') return 0;

    const end = parseInt(this.endYear);
    if (isNaN(end)) return 0;

    const currentYear = new Date().getFullYear();
    const remaining = (end - currentYear) + 1;
    return remaining > 0 ? remaining : 0;
});

scholarSchema.virtual('academic_year').get(function() {
    // If we have a start year, calculate the expected current year of study
    // otherwise fallback to the saved currentClass
    if (this.startYear && /^\d+$/.test(this.startYear)) {
        const start = parseInt(this.startYear);
        const currentYear = new Date().getFullYear();
        const yearOfStudy = (currentYear - start) + 1;

        if (yearOfStudy > 0) {
            const prefix = this.schoolType === 'University' ? 'Year' : 'Form';
            return `${prefix} ${yearOfStudy}`;
        }
    }
    return this.currentClass || 'N/A';
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

scholarSchema.statics.approve = function(id) {
    return this.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
};

scholarSchema.statics.delete = function(id) {
    return this.findByIdAndDelete(id);
};

scholarSchema.set('toJSON', { virtuals: true });
scholarSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Scholar', scholarSchema);
