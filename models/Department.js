const pool = require('../config/database');

class Department {
    static async getAll() {
        const result = await pool.query('SELECT * FROM departments ORDER BY name ASC');
        return result.rows;
    }

    static async getAllWithCounts() {
        const sql = `
            SELECT d.*, COUNT(u.id)::int as user_count
            FROM departments d
            LEFT JOIN users u ON d.id = u.department_id
            GROUP BY d.id
            ORDER BY d.name ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async getByName(name) {
        if (!name) return null;
        const result = await pool.query('SELECT * FROM departments WHERE LOWER(name) = LOWER($1)', [name.trim()]);
        return result.rows[0] || null;
    }

    static async create({ name, description, code }) {
        const sql = `
            INSERT INTO departments (name, description, code)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(sql, [name, description, code]);
        return result.rows[0];
    }

    static async update(id, data) {
        const { name, description, code } = data;

        let sql = 'UPDATE departments SET ';
        const params = [];
        const updates = [];
        let i = 1;

        if (name !== undefined) { updates.push(`name = $${i++}`); params.push(name); }
        if (description !== undefined) { updates.push(`description = $${i++}`); params.push(description); }
        if (code !== undefined) { updates.push(`code = $${i++}`); params.push(code); }

        if (updates.length === 0) return this.findById(id);

        sql += updates.join(', ');
        sql += ` WHERE id = $${i} RETURNING *`;
        params.push(id);

        const result = await pool.query(sql, params);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
        return result.rows[0];
    }

    static async getUsers(id) {
        const sql = `
            SELECT u.id, u.full_name, u.username, u.email, u.phone, u.created_at, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.department_id = $1
            ORDER BY u.full_name ASC
        `;
        const result = await pool.query(sql, [id]);
        return result.rows;
    }
}

module.exports = Department;
