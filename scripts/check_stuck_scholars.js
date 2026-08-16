const mongoose = require('mongoose');
require('dotenv').config();
const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const s = await Scholar.findOne({ fullName: /Grace Phiri/i }).lean();

        const orphans = await AcademicResult.find({
            scholarId: s._id,
            currentClass: { $in: [null, "undefined", ""] }
        }).lean();

        console.log(`Orphan results (no class): ${orphans.length}`);
        orphans.forEach(r => console.log(`- ${r.year} | ${r.term} | ${r.marks}%`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

check();
