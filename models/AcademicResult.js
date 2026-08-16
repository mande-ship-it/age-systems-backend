const mongoose = require('mongoose');

const academicResultSchema = new mongoose.Schema({
    scholarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholar', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    marks: { type: Number, required: true },
    gradeLetter: { type: String },
    gradePoint: { type: Number },
    year: { type: Number, required: true },
    currentClass: { type: String }, // e.g. Form 1, Year 1
    term: { type: String }, // For Secondary: Term 1, 2, 3
    semester: { type: String }, // For University: Semester 1, 2
    status: { type: String, enum: ['First Attempt', 'Repeat'], default: 'First Attempt' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Ensure unique index for scholar, subject, class, year, and term/semester
academicResultSchema.index({ scholarId: 1, subjectId: 1, currentClass: 1, year: 1, term: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('AcademicResult', academicResultSchema);
