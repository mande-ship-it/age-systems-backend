const mongoose = require('mongoose');
require('dotenv').config();
const Scholar = require('../models/Scholar');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const types = await Scholar.distinct('schoolType');
        console.log('DISTINCT SCHOOL TYPES:', types);

        const statuses = await Scholar.distinct('status');
        console.log('DISTINCT STATUSES:', statuses);

        const districts = await Scholar.distinct('district');
        console.log('DISTINCT DISTRICTS:', districts);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

debug();
