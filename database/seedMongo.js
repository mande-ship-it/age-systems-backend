const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import Models
const Role = require('../models/Role');
const Department = require('../models/Department');
const User = require('../models/User');
const OrganisationProfile = require('../models/OrganisationProfile');
const BackupSetting = require('../models/BackupSetting');

async function seed() {
    try {
        console.log('🚀 Starting MongoDB Seeding...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB.');

        // 1. Clear existing data (Optional, but good for a fresh start)
        await Promise.all([
            Role.deleteMany({}),
            Department.deleteMany({}),
            User.deleteMany({}),
            OrganisationProfile.deleteMany({}),
            BackupSetting.deleteMany({})
        ]);
        console.log('🧹 Cleared existing core data.');

        // 2. Seed Departments
        const depts = await Department.insertMany([
            { name: 'Programs', code: 'PROG', description: 'Core program operations and scholar support.' },
            { name: 'Finance & Administration', code: 'FIN', description: 'Financial management and office administration.' },
            { name: 'Human Resources', code: 'HR', description: 'Staff recruitment and personnel management.' },
            { name: 'Information Technology', code: 'IT', description: 'Systems maintenance and technical support.' }
        ]);
        console.log('✅ Departments seeded.');

        // 3. Seed Roles
        const roles = await Role.insertMany([
            { name: 'Administrator', description: 'Full system access.', icon: 'shield_rounded', color: '#9C27B0', isSystemRole: true },
            { name: 'Program Manager', description: 'Oversees program data.', icon: 'supervisor_account_rounded', color: '#2196F3', isSystemRole: true },
            { name: 'Data Officer', description: 'Manages data entry.', icon: 'storage_rounded', color: '#009688', isSystemRole: true },
            { name: 'Scholar', description: 'Student profile.', icon: 'school_rounded', color: '#4CAF50', isSystemRole: true }
        ]);
        console.log('✅ Roles seeded.');

        // 4. Seed Admin User
        // Password: Password123!
        const passwordHash = await bcrypt.hash('Password123!', 10);
        await User.create({
            email: 'edwardyoungshaba133@gmail.com',
            username: 'edward',
            passwordHash,
            roleId: roles[0]._id,
            departmentId: depts[3]._id,
            fullName: 'Edward Young Shaba',
            phone: '+265888000000',
            isActive: true,
            isFirstLogin: false
        });
        console.log('✅ Administrator account "edward" created.');

        // 5. Seed Organisation
        await OrganisationProfile.create({
            name: 'AGE Africa',
            type: 'Non-Profit',
            address: 'Lilongwe, Malawi',
            email: 'info@ageafrica.org',
            orgId: 'AGE-2026-0987',
            isVerified: true
        });
        console.log('✅ Organisation profile created.');

        // 6. Seed Backup Settings
        await BackupSetting.create({ autoBackupEnabled: true, frequency: 'Daily' });
        console.log('✅ System settings initialized.');

        console.log('🏁 MongoDB Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Error:', err.message);
        process.exit(1);
    }
}

seed();
