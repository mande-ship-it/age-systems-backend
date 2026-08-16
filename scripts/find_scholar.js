const mongoose = require('mongoose');
require('dotenv').config();
const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const scholar = await Scholar.findOne({ fullName: /Loyd Banega/i }).lean();
        if (!scholar) {
            console.log('Scholar not found.');
        } else {
            console.log('SCHOLAR FOUND:');
            console.log(JSON.stringify(scholar, null, 2));

            const results = await AcademicResult.find({ scholarId: scholar._id }).sort({ year: 1, term: 1, semester: 1 }).lean();
            console.log('\nACADEMIC RESULTS:');
            results.forEach(r => {
                console.log(`- ${r.year} | ${r.currentClass} | ${r.term || r.semester} | ${r.marks}% | ${r.status}`);
            });
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
