const pool = require('../config/database');

class School {
    static async create(data) {
        let {
            name, code, level, type, genderPolicy, region, district,
            address, postal, phone, altPhone, email, website,
            adminName, adminRole, adminPhone, adminEmail, description, notes, status
        } = data;

        // Auto-generate code if missing
        if (!code) {
            const countRes = await pool.query('SELECT COUNT(*) FROM schools');
            const nextId = parseInt(countRes.rows[0].count) + 1;
            code = `SCH-${nextId.toString().padStart(3, '0')}`;
        }

        const sql = `
            INSERT INTO schools (
                name, code, level, type, gender_policy, region, district,
                address, postal_address, phone, alt_phone, email, website,
                admin_name, admin_role, admin_phone, admin_email, description, notes, status
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            )
            RETURNING *
        `;
        const values = [
            name, code, level, type, genderPolicy, region, district,
            address, postal, phone, altPhone, email, website,
            adminName, adminRole, adminPhone, adminEmail, description, notes, status || 'Active'
        ];

        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getAll() {
        const result = await pool.query('SELECT * FROM schools ORDER BY name ASC');
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM schools WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async findByCode(code) {
        const result = await pool.query('SELECT * FROM schools WHERE code = $1', [code]);
        return result.rows[0] || null;
    }

    static async update(id, data) {
        const {
            name, code, level, type, genderPolicy, region, district,
            address, postal, phone, altPhone, email, website,
            adminName, adminRole, adminPhone, adminEmail, description, notes, status
        } = data;

        const sql = `
            UPDATE schools 
            SET
                name = $1, code = $2, level = $3, type = $4, gender_policy = $5,
                region = $6, district = $7, address = $8, postal_address = $9,
                phone = $10, alt_phone = $11, email = $12, website = $13,
                admin_name = $14, admin_role = $15, admin_phone = $16,
                admin_email = $17, description = $18, notes = $19, status = $20
            WHERE id = $21
            RETURNING *
        `;
        const values = [
            name, code, level, type, genderPolicy, region, district,
            address, postal, phone, altPhone, email, website,
            adminName, adminRole, adminPhone, adminEmail, description, notes, status,
            id
        ];

        const result = await pool.query(sql, values);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM schools WHERE id = $1 RETURNING id', [id]);
        return result.rows[0] || null;
    }

    static async getStats(id) {
        const scholarsSql = 'SELECT COUNT(*) FROM scholars WHERE school_id = $1';
        const resultsSql = `
            SELECT AVG(marks) as average_marks
            FROM academic_results ar
            JOIN scholars s ON ar.scholar_id = s.id
            WHERE s.school_id = $1
        `;

        const scholarsResult = await pool.query(scholarsSql, [id]);
        const resultsResult = await pool.query(resultsSql, [id]);

        return {
            totalScholars: parseInt(scholarsResult.rows[0].count),
            averageMarks: parseFloat(resultsResult.rows[0].average_marks || 0).toFixed(1)
        };
    }

    static async toggleStatus(id) {
        const sql = `
            UPDATE schools
            SET status = CASE WHEN status = 'Active' THEN 'Inactive' ELSE 'Active' END
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }
}

module.exports = School;
