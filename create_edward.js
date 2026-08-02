const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');
const Role = require('./models/Role');
const Department = require('./models/Department');

async function createEdward() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        // 1. Get or Create Administrator Role
        let adminRole = await Role.findOne({ name: 'Administrator' });
        if (!adminRole) {
            adminRole = await Role.create({
                name: 'Administrator',
                description: 'Full system access',
                isSystemRole: true
            });
        }

        // 2. Get or Create IT Department
        let itDept = await Department.findOne({ name: 'Information Technology' });
        if (!itDept) {
            itDept = await Department.create({
                name: 'Information Technology',
                code: 'IT'
            });
        }

        const passwordHash = await bcrypt.hash('Shaba123!', 10);

        // 3. Remove existing to prevent duplication
        await User.deleteMany({ email: 'edwardyoungshaba133@gmail.com' });

        // 4. Create Edward Shaba
        const user = await User.create({
            email: 'edwardyoungshaba133@gmail.com',
            username: 'edward.shaba',
            passwordHash,
            roleId: adminRole._id,
            departmentId: itDept._id,
            fullName: 'Edward Shaba',
            phone: '+265888000000',
            isActive: true,
            isFirstLogin: false
        });

        console.log('User "Edward Shaba" created successfully!');
        console.log('Login Email: edwardyoungshaba133@gmail.com');
        console.log('Password: Shaba123!');
        process.exit(0);
    } catch (err) {
        console.error('Error creating user:', err.message);
        process.exit(1);
    }
}

createEdward();
