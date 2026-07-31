const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const initDatabase = async () => {
    try {
        console.log('🔄 Initializing database schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        // Run the schema statements
        await pool.query(sql);
        console.log('✅ Database schema initialized successfully (tables created, default roles seeded).');
    } catch (err) {
        console.error('❌ Failed to initialize database schema:', err.message);
    } finally {
        // Close pool to allow script to exit
        await pool.end();
        process.exit(0);
    }
};

initDatabase();
