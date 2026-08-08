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
    // Standardize input
    if (this.fullName) this.fullName = this.fullName.trim();
    if (this.scholarId) this.scholarId = this.scholarId.trim();

    if (this.isNew && !this.scholarId) {
        console.log('[DEBUG] Generating unique scholarId...');

        // Find all AGE- IDs and extract numbers to find true maximum
        // This is more robust than sort({ scholarId: -1 }) on strings
        const allScholars = await this.constructor.find({
            scholarId: /^AGE-\d+/
        }, 'scholarId');

        let maxNum = 0;
        allScholars.forEach(s => {
            const match = s.scholarId.match(/AGE-(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNum) maxNum = num;
            }
        });

        let nextNumber = maxNum + 1;
        let uniqueId = `AGE-${nextNumber.toString().padStart(3, '0')}`;

        // Safety loop for potential gaps or race conditions
        let exists = await this.constructor.findOne({ scholarId: uniqueId });
        while (exists) {
            console.log(`[DEBUG] Collision detected for ${uniqueId}, incrementing...`);
            nextNumber++;
            uniqueId = `AGE-${nextNumber.toString().padStart(3, '0')}`;
            exists = await this.constructor.findOne({ scholarId: uniqueId });
        }

        console.log(`[DEBUG] Assigned ID: ${uniqueId}`);
        this.scholarId = uniqueId;
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

scholarSchema.statics.autoTransitionGraduates = async function() {
    // Find active scholars where yearsCompleted >= programDurationYears
    const dueForGraduation = await this.find({
        status: 'Active',
        $expr: { $gte: ["$yearsCompleted", "$programDurationYears"] }
    });

    if (dueForGraduation.length > 0) {
        await this.updateMany(
            { _id: { $in: dueForGraduation.map(s => s._id) } },
            { status: 'Graduated' }
        );
    }
    return dueForGraduation;
};

module.exports = mongoose.model('Scholar', scholarSchema);
