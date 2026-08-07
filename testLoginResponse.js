const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Role = require('./models/Role');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ username: 'admin' }).populate('roleId departmentId');

        const responseData = {
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role_name,
                department: user.department_name,
                // ...
            }
        };

        console.log('--- LOGIN RESPONSE SIMULATION ---');
        console.log(JSON.stringify(responseData, null, 2));
        console.log('---');
        console.log('Role field value:', responseData.user.role);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
