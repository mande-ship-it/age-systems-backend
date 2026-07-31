const pool = require('../../config/database');

const updateTable = async () => {
    try {
        console.log('🔄 Updating attendance_sessions table...');

        await pool.query(`
            ALTER TABLE attendance_sessions
            ADD COLUMN IF NOT EXISTS month INTEGER,
            ADD COLUMN IF NOT EXISTS week_number INTEGER,
            ADD COLUMN IF NOT EXISTS term VARCHAR(20),
            ADD COLUMN IF NOT EXISTS semester VARCHAR(20);
        `);

        console.log('✅ attendance_sessions table updated successfully.');
    } catch (err) {
        console.error('❌ Failed to update table:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
};

updateTable();
