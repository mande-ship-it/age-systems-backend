const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
    type: { type: String, required: true }, // University CHATS, Secondary CHATS, etc.
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    sessionDate: { type: Date, default: Date.now },
    facilitator: { type: String },
    location: { type: String },
    district: { type: String },
    month: { type: Number },
    weekNumber: { type: Number },
    year: { type: Number },
    term: { type: String },
    semester: { type: String },
    created_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

attendanceSessionSchema.virtual('session_date').get(function() {
    return this.sessionDate;
});

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
