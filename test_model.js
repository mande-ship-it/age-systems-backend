const mongoose = require('mongoose');
require('dotenv').config();
const Scholar = require('./models/Scholar');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testScholar = new Scholar({
        fullName: 'Test Progression',
        dob: new Date(2010, 0, 1),
        schoolType: 'Secondary',
        academicYear: 'Form 1',
        startYear: '2026',
        programDurationYears: 4,
        yearsCompleted: 0
    });

    await testScholar.validate();

    console.log('--- TEST SCHOLAR VIRTUALS ---');
    console.log('Scholar Name:', testScholar.fullName);
    console.log('Registered Class:', testScholar.registeredClass);
    console.log('Years Completed:', testScholar.yearsCompleted);
    console.log('Current Relative Year:', testScholar.currentRelativeYear);
    console.log('Years Remaining:', testScholar.yearsRemaining);
    console.log('Start Year Label:', testScholar.programStartYearLabel);

    if (testScholar.yearsRemaining === 4 && testScholar.currentRelativeYear === 1) {
        console.log('✅ PASS: Virtuals correctly calculated.');
    } else {
        console.log('❌ FAIL: Calculation mismatch.');
    }

    process.exit(0);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
