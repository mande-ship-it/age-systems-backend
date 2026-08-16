const mongoose = require('mongoose');
require('dotenv').config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('COLLECTIONS:', collections.map(c => c.name));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

debug();
