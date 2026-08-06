const pool = require('../config/database');

class Sponsor {
    static async create(data) {
        const { userId, name, organization, email, phone, contactPerson, sponsorshipType, amount, address, notes, status = 'Pending' } = data;
        const sql = `
            INSERT INTO sponsors (user_id, name, organization, email, phone, contact_person, sponsorship_type, amount, address, notes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const values = [userId || null, name, organization, email, phone, contactPerson, sponsorshipType, amount || 0, address, notes, status];
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getAll(status = null) {
        let sql = 'SELECT * FROM sponsors';
        const params = [];
        if (status) {
            sql += ' WHERE status = $1';
            params.push(status);
        }
        sql += ' ORDER BY name ASC';
        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async getByName(name) {
        const sql = 'SELECT * FROM sponsors WHERE name ILIKE $1';
        const result = await pool.query(sql, [name]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const sql = 'SELECT * FROM sponsors WHERE id = $1';
        const result = await pool.query(sql, [id]);
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
        const sql = `UPDATE sponsors SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async delete(id) {
        const sql = 'DELETE FROM sponsors WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }
}

module.exports = Sponsor;
