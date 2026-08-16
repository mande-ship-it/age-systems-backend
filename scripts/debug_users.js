const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find().lean();
        console.log('USERS:');
        users.forEach(u => {
            console.log(`- ${u.fullName} | Username: ${u.username} | Role: ${u.roleId} | District: ${u.assignedDistrict}`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

debug();
