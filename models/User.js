const pool = require('../config/database');

class User {
    static async create({
        email, username, passwordHash, roleId, fullName, phone, departmentId, location = null, bio = null, isActive = true, notes, otpCode = null, otpExpiry = null
    }) {
        const userEmail = (email || '').toLowerCase();
        const userUsername = (username || userEmail || '').toLowerCase();

        const sql = `
            INSERT INTO users (email, username, password_hash, role_id, full_name, phone, department_id, location, bio, is_active, notes, otp_code, otp_expiry, is_first_login)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
            RETURNING id, email, username, role_id, full_name, phone, department_id, location, bio, profile_picture, is_active, is_first_login, otp_code, otp_expiry, created_at
        `;
        const result = await pool.query(sql, [
            userEmail,
            userUsername,
            passwordHash,
            roleId,
            fullName,
            phone || null,
            departmentId || null,
            location,
            bio,
            isActive,
            notes || null,
            otpCode,
            otpExpiry
        ]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const sql = `
            SELECT u.*, r.name as role_name, r.permissions, d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE LOWER(u.email) = $1
        `;
        const result = await pool.query(sql, [email.toLowerCase()]);
        return result.rows[0] || null;
    }

    static async findByUsername(username) {
        const sql = `
            SELECT u.*, r.name as role_name, r.permissions, d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE LOWER(u.username) = $1
        `;
        const result = await pool.query(sql, [username.toLowerCase()]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const sql = `
            SELECT u.*, r.name as role_name, r.permissions, d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = $1
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async getAll() {
        const sql = `
            SELECT u.id, u.email, u.username, u.full_name, u.phone, u.location, u.profile_picture, u.is_active, u.created_at,
                   r.name as role_name, d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
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
            // Map camelCase to snake_case
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            fields.push(`${dbKey} = $${index++}`);
            values.push(value);
        }

        if (fields.length === 0) return this.findById(id);

        values.push(id);
        const sql = `
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING id, email, username, role_id, full_name, phone, department_id, location, bio, profile_picture, is_active, is_first_login
        `;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async delete(id) {
        const sql = 'DELETE FROM users WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async setOTP(userId, otp, expiry) {
        const sql = 'UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3';
        await pool.query(sql, [otp, expiry, userId]);
    }
}

module.exports = User;
