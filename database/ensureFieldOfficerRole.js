const mongoose = require('mongoose');
require('dotenv').config();
const Role = require('../models/Role');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const fieldOfficerRole = {
            name: 'Field Officer',
            description: 'Field operations and scholar data tracking.',
            icon: 'explore_rounded',
            color: '#E05B1C',
            isSystemRole: true,
            permissions: [
                'scholars.view',
                'scholars.create',
                'academics.view',
                'academics.record',
                'attendance.view',
                'attendance.record'
            ]
        };

        const existing = await Role.findOne({ name: 'Field Officer' });
        if (existing) {
            console.log('Field Officer role already exists. Updating permissions...');
            existing.permissions = fieldOfficerRole.permissions;
            existing.description = fieldOfficerRole.description;
            existing.icon = fieldOfficerRole.icon;
            existing.color = fieldOfficerRole.color;
            await existing.save();
            console.log('Field Officer role updated successfully.');
        } else {
            console.log('Field Officer role does not exist. Creating...');
            await Role.create(fieldOfficerRole);
            console.log('Field Officer role created successfully.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error running script:', err);
        process.exit(1);
    }
}

run();
