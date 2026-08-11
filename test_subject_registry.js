const mongoose = require('mongoose');
require('dotenv').config();
const Subject = require('./models/Subject');
const Scholar = require('./models/Scholar');
const { recordResults } = require('./controllers/academicController');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Create a new Secondary Subject
        const testSubName = 'New Secondary Science ' + Date.now();
        const testSubCode = 'SCI' + Math.floor(Math.random() * 1000);

        console.log(`1. Registering new subject: ${testSubName}...`);
        const newSub = await Subject.create({
            name: testSubName,
            code: testSubCode,
            level: 'Secondary'
        });
        console.log('✅ Subject Created:', newSub.name, 'Code:', newSub.code);

        // 2. Fetch Registry
        console.log('2. Verifying registry retrieval...');
        const registry = await Subject.find({ level: 'Secondary' });
        const found = registry.some(s => s.code === testSubCode);
        if (found) {
            console.log('✅ PASS: New subject appears in Secondary Registry.');
        } else {
            console.log('❌ FAIL: Subject missing from registry.');
        }

        // 3. Test "Typed" University Entry (Verify auto-registration)
        const uniCourseName = 'Advanced Quantum Computing ' + Date.now();
        console.log(`3. Testing Uni auto-registration for course: ${uniCourseName}...`);

        // Find a test scholar
        const scholar = await Scholar.findOne({ schoolType: 'University' });
        if (scholar) {
            const req = {
                body: {
                    scholarId: scholar._id,
                    year: 2026,
                    semester: 'Semester 1',
                    schoolType: 'University',
                    results: [{ subjectName: uniCourseName, marks: 95 }]
                }
            };
            const res = {
                status: () => ({ json: () => {} })
            };

            await recordResults(req, res, (err) => { if(err) console.error(err); });

            const autoSub = await Subject.findOne({ name: uniCourseName });
            if (autoSub) {
                console.log('✅ PASS: University course automatically registered in registry.');
                await Subject.findByIdAndDelete(autoSub._id);
            } else {
                console.log('❌ FAIL: University course was not registered.');
            }
        } else {
            console.log('ℹ️ SKIP: No university scholar found for auto-reg test.');
        }

        // Cleanup
        await Subject.findByIdAndDelete(newSub._id);
        console.log('✅ Cleanup complete.');

    } catch (err) {
        console.error('❌ Error during test:', err.message);
    } finally {
        process.exit(0);
    }
}

test();
