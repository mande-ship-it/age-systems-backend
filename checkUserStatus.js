const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ username: 'edward' });
        if (user) {
            console.log('User: edward');
            console.log('isFirstLogin:', user.isFirstLogin);
            // If it's true, let's set it to false so it doesn't force a reset
            if (user.isFirstLogin === true) {
                user.isFirstLogin = false;
                await user.save();
                console.log('isFirstLogin updated to false.');
            }
        } else {
            console.log('User edward not found.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
