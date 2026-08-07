const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Role = require('./models/Role');
const Department = require('./models/Department');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ username: { $in: ['admin', 'edward'] } }).populate('roleId');
        for (let user of users) {
            console.log(`User: ${user.username}`);
            console.log(`Role Object:`, user.roleId);
            console.log(`Role Name Virtual: ${user.role_name}`);
            console.log('---');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
debug();
