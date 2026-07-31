const pool = require('./config/database');

async function updateRoles() {
    try {
        console.log('Updating system roles...');

        // 1. Ensure 'Country Director' exists
        const directorRes = await pool.query("SELECT * FROM roles WHERE name = 'Country Director'");
        if (directorRes.rowCount === 0) {
            await pool.query(`
                INSERT INTO roles (name, description, icon, color, is_system_role)
                VALUES ('Country Director', 'High-level oversight and final approvals for all system entities.', 'vps_rounded', '#1A237E', TRUE)
            `);
            console.log("✅ Added 'Country Director' role.");
        }

        // 2. Ensure 'Program Coordinator' exists (rename 'Program Manager' if it exists, or just add it)
        const managerRes = await pool.query("SELECT * FROM roles WHERE name = 'Program Manager'");
        if (managerRes.rowCount > 0) {
            await pool.query("UPDATE roles SET name = 'Program Coordinator' WHERE name = 'Program Manager'");
            console.log("✅ Renamed 'Program Manager' to 'Program Coordinator'.");
        } else {
            const coordinatorRes = await pool.query("SELECT * FROM roles WHERE name = 'Program Coordinator'");
            if (coordinatorRes.rowCount === 0) {
                await pool.query(`
                    INSERT INTO roles (name, description, icon, color, is_system_role)
                    VALUES ('Program Coordinator', 'Oversees scholars, schools, sponsors, and academic records.', 'supervisor_account_rounded', '#2196F3', TRUE)
                `);
                console.log("✅ Added 'Program Coordinator' role.");
            }
        }

        console.log('Roles update completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Roles update failed:', err);
        process.exit(1);
    }
}

updateRoles();
