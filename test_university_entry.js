const mongoose = require('mongoose');
require('dotenv').config();
const Scholar = require('./models/Scholar');
const AcademicResult = require('./models/AcademicResult');
const Subject = require('./models/Subject');
const { evaluateProgression } = require('./utils/progressionEngine');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create a test university scholar
    const scholar = new Scholar({
        fullName: 'Uni Test Scholar',
        dob: new Date(2005, 0, 1),
        schoolType: 'University',
        academicYear: 'Year 1',
        startYear: '2026',
        programDurationYears: 4,
        yearsCompleted: 0,
        status: 'Active'
    });
    await scholar.save();
    console.log('✅ Created scholar:', scholar.fullName, 'ID:', scholar.scholarId);

    // 2. Simulate "Typed" course names
    const courses = ['Introduction to AI', 'Advanced Database Systems'];
    const results = [];

    for (const name of courses) {
        let subject = await Subject.findOne({ name, level: 'University' });
        if (!subject) {
            subject = await Subject.create({ name, code: 'UNI' + Math.floor(Math.random()*1000), level: 'University' });
        }

        // Add 2 semesters of results
        await AcademicResult.create({ scholarId: scholar._id, subjectId: subject._id, marks: 75, year: 2026, semester: 'Semester 1' });
        await AcademicResult.create({ scholarId: scholar._id, subjectId: subject._id, marks: 85, year: 2026, semester: 'Semester 2' });
    }

    console.log('✅ Added 2 semesters of results for typed courses.');

    // 4. Run progression logic
    console.log('🚀 Evaluating progression...');
    await evaluateProgression(scholar._id, 2026);

    // 5. Verify promotion
    const updatedScholar = await Scholar.findById(scholar._id);
    console.log('--- PROGRESSION RESULT ---');
    console.log('New Academic Year:', updatedScholar.academicYear);
    console.log('Years Completed:', updatedScholar.yearsCompleted);
    console.log('Status:', updatedScholar.status);

    if (updatedScholar.academicYear === 'Year 2' && updatedScholar.yearsCompleted === 1) {
        console.log('✅ PASS: University Scholar promoted to Year 2.');
    } else {
        console.log('❌ FAIL: Promotion failed.');
    }

    // 6. Cleanup
    await Scholar.findByIdAndDelete(scholar._id);
    await AcademicResult.deleteMany({ scholarId: scholar._id });
    console.log('✅ Cleanup complete.');

    process.exit(0);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
