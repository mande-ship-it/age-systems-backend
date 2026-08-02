const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    scholarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholar', required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    notes: { type: String }
}, { timestamps: true });

// Ensure one entry per scholar per session
attendanceSchema.index({ sessionId: 1, scholarId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
