const mongoose = require('mongoose');
require('dotenv').config();
const Role = require('../models/Role');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const r = await Role.findById('6a7ee9d74f83b8809a4727b7').lean();
        console.log('ROLE:', r.name);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

debug();
