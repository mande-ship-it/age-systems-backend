const mongoose = require('mongoose');
require('dotenv').config();
const Attendance = require('../models/Attendance');
const Scholar = require('../models/Scholar');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const scholars = await Scholar.find({ fullName: /Grace|Mercy/ }).lean();
        for (const s of scholars) {
            const count = await Attendance.countDocuments({ scholarId: s._id });
            console.log(`${s.fullName} (${s.district}) Attendance count:`, count);
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

debug();
