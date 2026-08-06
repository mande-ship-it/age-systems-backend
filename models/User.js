const pool = require('../config/database');

class User {
    static async create({
        email, username, passwordHash, roleId, departmentId, fullName, phone, isActive = true
    }) {
        const sql = `
            INSERT INTO users (email, username, password_hash, role_id, department_id, full_name, phone, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const result = await pool.query(sql, [
            email.toLowerCase(), username.toLowerCase(), passwordHash, roleId || null, departmentId || null, fullName, phone, isActive
        ]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const sql = `
            SELECT u.*, r.name as role_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE LOWER(u.email) = $1
        `;
        const result = await pool.query(sql, [email.toLowerCase()]);
        return result.rows[0] || null;
    }

    static async findByUsername(username) {
        const sql = `
            SELECT u.*, r.name as role_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE LOWER(u.username) = $1
        `;
        const result = await pool.query(sql, [username.toLowerCase()]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const sql = `
            SELECT u.*, r.name as role_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = $1
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async getAll() {
        const sql = `
            SELECT u.*, r.name as role_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            ORDER BY u.created_at DESC
        `;
        const result = await pool.query(sql);
        return result.rows;
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
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        return result.rows[0];
    }

    static async setOTP(userId, otp, expiry) {
        const sql = 'UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3';
        await pool.query(sql, [otp, expiry, userId]);
    }
}

module.exports = User;
