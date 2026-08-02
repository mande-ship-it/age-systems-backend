const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');
const Role = require('./models/Role');

async function createTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        let role = await Role.findOne({ name: 'Administrator' });
        if (!role) {
            role = await Role.create({ name: 'Administrator', isSystemRole: true });
        }

        const passwordHash = await bcrypt.hash('Password123!', 10);

        await User.deleteMany({ email: 'test@example.com' });

        await User.create({
            email: 'test@example.com',
            username: 'testuser',
            passwordHash,
            roleId: role._id,
            fullName: 'Test User',
            isActive: true,
            isFirstLogin: false
        });

        console.log('Test user created: test@example.com / Password123!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createTestUser();
