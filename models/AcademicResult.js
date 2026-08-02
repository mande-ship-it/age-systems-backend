const mongoose = require('mongoose');

const academicResultSchema = new mongoose.Schema({
    scholarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholar', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    marks: { type: Number, required: true },
    gradeLetter: { type: String },
    gradePoint: { type: Number }, // Stores GPA or Points
    year: { type: Number, required: true },
    term: { type: String }, // Term 1, 2, 3
    semester: { type: String } // Semester 1, 2
}, { timestamps: true });

// Ensure unique result per scholar, subject, year, and period
academicResultSchema.index({ scholarId: 1, subjectId: 1, year: 1, term: 1, semester: 1 }, { unique: true });

academicResultSchema.statics.getByScholar = function(scholarId, year = null) {
    const filter = { scholarId };
    if (year) filter.year = year;
    return this.find(filter).populate('subjectId').sort({ year: -1, term: 1, semester: 1 });
};

module.exports = mongoose.model('AcademicResult', academicResultSchema);
