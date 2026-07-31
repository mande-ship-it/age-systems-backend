const pool = require('../config/database');

async function seedUser() {
    console.log('🚀 Seeding production Administrator account...');
    try {
        const sql = `
            INSERT INTO users (email, username, password_hash, role_id, department_id, full_name, phone)
            VALUES (
                'edwardyoungshaba133@gmail.com',
                'edward',
                '$2b$10$Xy0f.8L.B3r4mP3pG5U7eOq/mK6.wEw.jU.v7v.v7v.v7v.v7v.v7',
                1,
                4,
                'Edward Young Shaba',
                '+265888000000'
            )
            ON CONFLICT (email) DO UPDATE SET
                username = EXCLUDED.username,
                role_id = 1;
        `;

        await pool.query(sql);
        console.log('✅ Administrator account "edward" created/updated successfully.');
        console.log('📧 Email: edwardyoungshaba133@gmail.com');
        console.log('🔑 Default Password: Password123!');
    } catch (err) {
        console.error('❌ Error seeding user:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seedUser();
