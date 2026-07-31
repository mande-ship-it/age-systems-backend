const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function seedDatabase() {
    try {
        console.log('🔄 Resetting database schema...');
        
        // Drop all tables cleanly in correct order of dependency
        await pool.query(`
            DROP TABLE IF EXISTS audit_logs CASCADE;
            DROP TABLE IF EXISTS notifications CASCADE;
            DROP TABLE IF EXISTS documents CASCADE;
            DROP TABLE IF EXISTS payments CASCADE;
            DROP TABLE IF EXISTS academic_results CASCADE;
            DROP TABLE IF EXISTS subjects CASCADE;
            DROP TABLE IF EXISTS attendance CASCADE;
            DROP TABLE IF EXISTS attendance_sessions CASCADE;
            DROP TABLE IF EXISTS scholars CASCADE;
            DROP TABLE IF EXISTS sponsors CASCADE;
            DROP TABLE IF EXISTS schools CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS roles CASCADE;
            DROP TABLE IF EXISTS backups CASCADE;
            DROP TABLE IF EXISTS backup_settings CASCADE;
            DROP TABLE IF EXISTS organisation_profile CASCADE;
            DROP TABLE IF EXISTS events CASCADE;
            DROP TABLE IF EXISTS user_settings CASCADE;
        `);

        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        // Run the schema statements to drop and recreate tables
        await pool.query(sql);
        console.log('✅ Tables dropped and schema recreated successfully.');

        // Re-hash password for default admin
        // Email: admin@ageafrica.org, Password: Password123!
        const adminHash = await bcrypt.hash('Password123!', 10);
        await pool.query(
            `UPDATE users SET password_hash = $1 WHERE email = 'admin@ageafrica.org'`,
            [adminHash]
        );
        console.log('✅ Default admin password set.');

        // 1. Insert extra users
        console.log('🌱 Seeding extra users...');
        const staffHash = await bcrypt.hash('Staff123!', 10);
        await pool.query(`
            INSERT INTO users (email, username, password_hash, role_id, full_name, phone, department, is_active)
            VALUES 
            ('manager@ageafrica.org', 'manager', '${staffHash}', 2, 'Clara Banda', '+265888111111', 'Programs', TRUE),
            ('officer@ageafrica.org', 'officer', '${staffHash}', 3, 'John Phiri', '+265888222222', 'Data Operations', TRUE),
            ('finance@ageafrica.org', 'finance', '${staffHash}', 4, 'Grace Chiumia', '+265888333333', 'Finance', TRUE)
        `);

        // 2. Insert schools
        console.log('🌱 Seeding schools...');
        await pool.query(`
            INSERT INTO schools (name, code, level, type, region, district, address, phone, email, admin_name, status)
            VALUES
            ('Lilongwe Girls Secondary School', 'LIL-GIRLS', 'Secondary', 'Public', 'Central', 'Lilongwe', 'Area 10, Lilongwe', '+2651750001', 'info@lilongwegirls.edu.mw', 'Mrs. J. Nkhoma', 'Active'),
            ('Blantyre Secondary School', 'BL-SEC', 'Secondary', 'Public', 'Southern', 'Blantyre', 'BCA Hills, Blantyre', '+2651840001', 'admin@blantyresec.edu.mw', 'Mr. D. Chanza', 'Active'),
            ('Mzuzu Government Secondary School', 'MZ-GOV', 'Secondary', 'Public', 'Northern', 'Mzimba', 'Luwinga, Mzuzu', '+2651310001', 'info@mzuzugov.edu.mw', 'Mr. S. Msiska', 'Active'),
            ('Zomba Catholic Secondary School', 'ZM-CATH', 'Secondary', 'Public', 'Southern', 'Zomba', 'Chinamwali, Zomba', '+2651520001', 'zombacatholic@edu.mw', 'Sister Mary Phiri', 'Active'),
            ('Mangochi Secondary School', 'MA-SEC', 'Secondary', 'Public', 'Southern', 'Mangochi', 'Town Centre, Mangochi', '+2651590001', 'mangochisec@edu.mw', 'Mr. P. Banda', 'Active')
        `);

        // 3. Insert sponsors
        console.log('🌱 Seeding sponsors...');
        await pool.query(`
            INSERT INTO sponsors (name, organization, email, phone, contact_person, sponsorship_type, amount, status)
            VALUES
            ('Keep Fit Foundation', 'Keep Fit Inc', 'keepfit@foundation.org', '+15551234', 'Sarah Jenkins', 'Platinum', 5000000.00, 'Active'),
            ('Hope for Girls International', 'Hope Intl', 'hope@girlsintl.org', '+44207946', 'Dr. Helen Carter', 'Gold', 3000000.00, 'Active'),
            ('Malawian Future Scholars Trust', 'MFST', 'info@mfst.org.mw', '+2651820002', 'Bentry Kalua', 'Silver', 1500000.00, 'Active')
        `);

        // 4. Insert scholars
        console.log('🌱 Seeding scholars...');
        await pool.query(`
            INSERT INTO scholars (scholar_id, school_id, sponsor_id, dob, sex, phone, village, district, school_type, start_year, end_year, donor, status, academic_year, guardian_name)
            VALUES
            ('AGE-001', 1, 1, '2008-05-12', 'Female', '+265999000111', 'Area 25', 'Lilongwe', 'Secondary', '2023', '2027', 'Keep Fit Foundation', 'Active', 'Form 3', 'James Banda'),
            ('AGE-002', 1, 2, '2007-09-22', 'Female', '+265999000222', 'Area 18', 'Lilongwe', 'Secondary', '2023', '2027', 'Hope for Girls International', 'Active', 'Form 3', 'Aness Phiri'),
            ('AGE-003', 2, 1, '2008-01-05', 'Female', '+265999000333', 'Ndirande', 'Blantyre', 'Secondary', '2024', '2028', 'Keep Fit Foundation', 'Active', 'Form 2', 'Henry Chancy'),
            ('AGE-004', 2, 3, '2007-11-15', 'Female', '+265999000444', 'Limbe', 'Blantyre', 'Secondary', '2024', '2028', 'Malawian Future Scholars Trust', 'Active', 'Form 2', 'Martha Kachale'),
            ('AGE-005', 3, 2, '2009-03-30', 'Female', '+265999000555', 'Luwinga', 'Mzimba', 'Secondary', '2025', '2029', 'Hope for Girls International', 'Active', 'Form 1', 'Derrick Gondwe'),
            ('AGE-006', 3, NULL, '2008-07-19', 'Female', '+265999000666', 'Chimaliro', 'Mzimba', 'Secondary', '2025', '2029', 'None', 'Active', 'Form 1', 'Agness Munthali'),
            ('AGE-007', 4, 1, '2007-04-10', 'Female', '+265999000777', 'Chinamwali', 'Zomba', 'Secondary', '2022', '2026', 'Keep Fit Foundation', 'Graduated', 'Form 4 Completed', 'Limbani Chiume'),
            ('AGE-008', 4, 3, '2008-12-01', 'Female', '+265999000888', 'Matawale', 'Zomba', 'Secondary', '2023', '2027', 'Malawian Future Scholars Trust', 'Active', 'Form 3', 'Felix Zimba'),
            ('AGE-009', 5, 2, '2009-08-14', 'Female', '+265999000999', 'Monkey Bay', 'Mangochi', 'Secondary', '2025', '2029', 'Hope for Girls International', 'Active', 'Form 1', 'Mussa Ali'),
            ('AGE-010', 2, 2, '2008-02-28', 'Female', '+265999000100', 'Songwe', 'Karonga', 'Secondary', '2024', '2028', 'Hope for Girls International', 'Active', 'Form 2', 'Thomas Phiri'),
            ('AGE-011', 1, 1, '2008-06-18', 'Female', '+265999000101', 'Area 36', 'Lilongwe', 'Secondary', '2024', '2028', 'Keep Fit Foundation', 'Suspended', 'Form 2', 'Rose Banda'),
            ('AGE-012', 4, 3, '2007-10-05', 'Female', '+265999000102', 'Chikanda', 'Zomba', 'Secondary', '2023', '2027', 'Malawian Future Scholars Trust', 'Inactive', 'Form 3', 'George Tembo')
        `);

        // 5. Insert subjects
        console.log('🌱 Seeding subjects...');
        await pool.query(`
            INSERT INTO subjects (name, code, level)
            VALUES
            ('Mathematics', 'MATH', 'Secondary'),
            ('English', 'ENG', 'Secondary'),
            ('Physical Science', 'PHYSCI', 'Secondary'),
            ('Biology', 'BIO', 'Secondary'),
            ('Geography', 'GEO', 'Secondary'),
            ('History', 'HIST', 'Secondary')
        `);

        // 6. Insert academic results
        console.log('🌱 Seeding academic results...');
        // Insert results for the 12 scholars. Let's make sure some fail (avg < 50) and some excel
        await pool.query(`
            INSERT INTO academic_results (scholar_id, subject_id, marks, grade_letter, grade_point, year, term)
            VALUES
            -- Scholar 1 (AGE-001) - Excellent results
            (1, 1, 85.00, 'A', 4.00, 2024, 'Term 1'),
            (1, 2, 78.00, 'B', 3.00, 2024, 'Term 1'),
            (1, 3, 82.00, 'A', 4.00, 2024, 'Term 1'),
            (1, 1, 88.00, 'A', 4.00, 2025, 'Term 1'),
            (1, 2, 80.00, 'A', 4.00, 2025, 'Term 1'),

            -- Scholar 2 (AGE-002) - Average results
            (2, 1, 62.00, 'C', 2.00, 2024, 'Term 1'),
            (2, 2, 65.00, 'C', 2.00, 2024, 'Term 1'),
            (2, 3, 58.00, 'D', 1.00, 2024, 'Term 1'),
            (2, 1, 68.00, 'B', 3.00, 2025, 'Term 1'),

            -- Scholar 3 (AGE-003) - Good results
            (3, 1, 72.00, 'B', 3.00, 2024, 'Term 1'),
            (3, 2, 75.00, 'B', 3.00, 2024, 'Term 1'),
            (3, 3, 70.00, 'B', 3.00, 2024, 'Term 1'),

            -- Scholar 4 (AGE-004) - At Risk (Failing Marks)
            (4, 1, 45.00, 'F', 0.00, 2024, 'Term 1'),
            (4, 2, 48.00, 'F', 0.00, 2024, 'Term 1'),
            (4, 3, 40.00, 'F', 0.00, 2024, 'Term 1'),

            -- Scholar 5 (AGE-005) - Good results
            (5, 1, 78.00, 'B', 3.00, 2025, 'Term 1'),
            (5, 2, 82.00, 'A', 4.00, 2025, 'Term 1'),

            -- Scholar 6 (AGE-006) - Average results
            (6, 1, 55.00, 'D', 1.00, 2025, 'Term 1'),
            (6, 2, 59.00, 'D', 1.00, 2025, 'Term 1'),

            -- Scholar 7 (AGE-007) - Excellent results (Graduated)
            (7, 1, 90.00, 'A', 4.00, 2024, 'Term 1'),
            (7, 2, 88.00, 'A', 4.00, 2024, 'Term 1'),

            -- Scholar 8 (AGE-008) - Good results
            (8, 1, 74.00, 'B', 3.00, 2024, 'Term 1'),
            (8, 2, 76.00, 'B', 3.00, 2024, 'Term 1'),

            -- Scholar 9 (AGE-009) - Good results
            (9, 1, 80.00, 'A', 4.00, 2025, 'Term 1'),
            (9, 2, 78.00, 'B', 3.00, 2025, 'Term 1'),

            -- Scholar 10 (AGE-010) - Average results
            (10, 1, 60.00, 'C', 2.00, 2024, 'Term 1'),
            (10, 2, 63.00, 'C', 2.00, 2024, 'Term 1'),

            -- Scholar 11 (AGE-011) - Failing marks (Suspended)
            (11, 1, 38.00, 'F', 0.00, 2024, 'Term 1'),
            (11, 2, 42.00, 'F', 0.00, 2024, 'Term 1'),

            -- Scholar 12 (AGE-012) - Average marks (Inactive)
            (12, 1, 50.00, 'D', 1.00, 2024, 'Term 1'),
            (12, 2, 52.00, 'D', 1.00, 2024, 'Term 1')
        `);

        // 7. Insert attendance sessions
        console.log('🌱 Seeding attendance sessions...');
        await pool.query(`
            INSERT INTO attendance_sessions (type, school_id, session_date, facilitator, location)
            VALUES
            ('CHATs', 1, '2025-05-10', 'Clara Banda', 'Lilongwe Girls Assembly Hall'),
            ('Study Circle', 1, '2025-05-17', 'John Phiri', 'Lilongwe Girls Classroom 4'),
            ('CHATs', 2, '2025-05-12', 'Clara Banda', 'Blantyre Sec Common Room'),
            ('Study Circle', 3, '2025-05-14', 'Mrs. Gondwe', 'Mzuzu Gov Library'),
            ('CHATs', 4, '2025-05-15', 'Sister Mary', 'Zomba Catholic Hall')
        `);

        // 8. Insert attendance logs
        console.log('🌱 Seeding attendance records...');
        // Link sessions to active scholars
        // Session 1 (Lilongwe Girls) -> Scholars 1, 2, 11
        // Session 2 (Lilongwe Girls) -> Scholars 1, 2, 11
        // Session 3 (Blantyre Sec) -> Scholars 3, 4, 10
        // Session 4 (Mzuzu Gov) -> Scholars 5, 6
        // Session 5 (Zomba Catholic) -> Scholars 7, 8, 12
        await pool.query(`
            INSERT INTO attendance (session_id, scholar_id, status, notes)
            VALUES
            (1, 1, 'present', 'Active participation'),
            (1, 2, 'present', ''),
            (1, 11, 'absent', 'Suspended status'),
            
            (2, 1, 'present', ''),
            (2, 2, 'present', ''),
            (2, 11, 'absent', ''),

            (3, 3, 'present', 'Engaged in discussion'),
            (3, 4, 'absent', 'Reported sick'),
            (3, 10, 'present', ''),

            (4, 5, 'present', ''),
            (4, 6, 'present', ''),

            (5, 7, 'present', 'Completed study assistance'),
            (5, 8, 'present', ''),
            (5, 12, 'absent', 'Absent without leave')
        `);

        // 9. Insert payments (Finance)
        console.log('🌱 Seeding finance payments...');
        await pool.query(`
            INSERT INTO payments (scholar_id, amount, status, purpose, payment_date)
            VALUES
            (1, 150000.00, 'Completed', 'Tuition Fees', '2025-01-10'),
            (1, 35000.00, 'Completed', 'School Uniform & Shoes', '2025-01-12'),
            (2, 150000.00, 'Completed', 'Tuition Fees', '2025-01-10'),
            (2, 45000.00, 'Completed', 'Textbooks & Stationery', '2025-01-11'),
            (3, 160000.00, 'Completed', 'Tuition Fees', '2025-01-15'),
            (4, 160000.00, 'Completed', 'Tuition Fees', '2025-01-15'),
            (5, 180000.00, 'Completed', 'Tuition Fees', '2025-02-05'),
            (5, 30000.00, 'Completed', 'Pocket Money Allowance', '2025-02-07'),
            (8, 150000.00, 'Completed', 'Tuition Fees', '2025-01-10'),
            (10, 160000.00, 'Completed', 'Tuition Fees', '2025-01-15'),
            (11, 150000.00, 'Completed', 'Tuition Fees', '2025-01-10')
        `);

        console.log('✅ Seeding database completed successfully!');
    } catch (err) {
        console.error('❌ Seeding database failed:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seedDatabase();
