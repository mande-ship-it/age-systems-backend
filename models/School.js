const pool = require('../config/database');

class School {
    static async create(data) {
        const { name, level, type, genderPolicy, region, district, address, postalAddress, phone, altPhone, email, website, adminName, adminRole, adminPhone, adminEmail, description, notes } = data;

        // Auto-generate code like SCH-001
        const countRes = await pool.query('SELECT COUNT(*) FROM schools');
        const count = parseInt(countRes.rows[0].count);
        const code = `SCH-${(count + 1).toString().padStart(3, '0')}`;

        const sql = `
            INSERT INTO schools (name, code, level, type, gender_policy, region, district, address, postal_address, phone, alt_phone, email, website, admin_name, admin_role, admin_phone, admin_email, description, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;
        const values = [name, code, level, type, genderPolicy, region, district, address, postalAddress, phone, altPhone, email, website, adminName, adminRole, adminPhone, adminEmail, description, notes];
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

    static async update(id, data) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(data)) {
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            fields.push(`${dbKey} = $${index++}`);
            values.push(value);
        }

        if (fields.length === 0) return this.findById(id);

        values.push(id);
        const sql = `UPDATE schools SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM schools WHERE id = $1 RETURNING id', [id]);
        return result.rows[0] || null;
    }
}

module.exports = School;
