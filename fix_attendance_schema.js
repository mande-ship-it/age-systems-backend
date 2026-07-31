const pool = require('./config/database');

async function fix() {
    console.log('🚀 Fixing Attendance Session Schema...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Change month from integer to varchar
        console.log('Changing "month" column type to character varying...');
        await client.query(`
            ALTER TABLE attendance_sessions
            ALTER COLUMN month TYPE character varying(20) USING month::text;
        `);

        await client.query('COMMIT');
        console.log('✅ Success: month column updated to character varying.');
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

fix();
