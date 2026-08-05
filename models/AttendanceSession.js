const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
    type: { type: String, required: true }, // CHATs, Study Circle
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    sessionDate: { type: Date, required: true, default: Date.now },
    facilitator: { type: String },
    location: { type: String },
    district: { type: String },
    month: { type: String },
    weekNumber: { type: Number },
    year: { type: Number },
    term: { type: String },
    semester: { type: String }
}, { timestamps: true });

attendanceSessionSchema.statics.getAll = function(filters = {}) {
    let query = this.find().populate('schoolId').sort({ sessionDate: -1, createdAt: -1 });

    if (filters.type) query = query.where('type').equals(filters.type);
    if (filters.schoolId) query = query.where('schoolId').equals(filters.schoolId);
    if (filters.district) query = query.where('district').equals(filters.district);
    if (filters.month) query = query.where('month').equals(filters.month);
    if (filters.weekNumber) query = query.where('weekNumber').equals(filters.weekNumber);
    if (filters.term) query = query.where('term').equals(filters.term);
    if (filters.semester) query = query.where('semester').equals(filters.semester);

    return query;
};

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
