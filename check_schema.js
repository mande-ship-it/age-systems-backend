const pool = require('./config/database');

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'attendance_sessions'
            ORDER BY ordinal_position;
        `);
        console.log('--- Table Schema: attendance_sessions ---');
        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

check();
