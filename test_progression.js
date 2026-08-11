const mongoose = require('mongoose');
require('dotenv').config();
const Scholar = require('./models/Scholar');
const AcademicResult = require('./models/AcademicResult');
const Subject = require('./models/Subject');
const { evaluateProgression } = require('./utils/progressionEngine');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create a test scholar
    const scholar = new Scholar({
        fullName: 'Spec Test Scholar',
        dob: new Date(2010, 0, 1),
        schoolType: 'Secondary',
        academicYear: 'Form 1',
        startYear: '2026',
        programDurationYears: 4,
        yearsCompleted: 0,
        status: 'Active'
    });
    await scholar.save();
    console.log('✅ Created scholar:', scholar.fullName, 'ID:', scholar.scholarId);

    // 2. Create a test subject
    let subject = await Subject.findOne({ name: 'Mathematics', level: 'Secondary' });
    if (!subject) {
        subject = await Subject.create({ name: 'Mathematics', code: 'MATH001', level: 'Secondary' });
    }
    console.log('✅ Using subject:', subject.name);

    // 3. Add results for 3 terms (Secondary)
    // Term 1: 50%
    await AcademicResult.create({ scholarId: scholar._id, subjectId: subject._id, marks: 50, year: 2026, term: 'Term 1' });
    // Term 2: 60%
    await AcademicResult.create({ scholarId: scholar._id, subjectId: subject._id, marks: 60, year: 2026, term: 'Term 2' });
    // Term 3: 70%
    await AcademicResult.create({ scholarId: scholar._id, subjectId: subject._id, marks: 70, year: 2026, term: 'Term 3' });

    console.log('✅ Added 3 terms of results.');

    // 4. Run progression logic
    console.log('🚀 Evaluating progression...');
    const result = await evaluateProgression(scholar._id, 2026);

    // 5. Verify promotion
    const updatedScholar = await Scholar.findById(scholar._id);
    console.log('--- PROGRESSION RESULT ---');
    console.log('New Academic Year:', updatedScholar.academicYear);
    console.log('Years Completed:', updatedScholar.yearsCompleted);
    console.log('Years Remaining:', updatedScholar.yearsRemaining);
    console.log('Status:', updatedScholar.status);

    if (updatedScholar.academicYear === 'Form 2' && updatedScholar.yearsCompleted === 1) {
        console.log('✅ PASS: Scholar promoted to Form 2.');
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
