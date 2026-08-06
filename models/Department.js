const pool = require('../config/database');

class Department {
    static async getAll() {
        const result = await pool.query('SELECT * FROM departments ORDER BY name ASC');
        return result.rows;
    }

    static async getAllWithCounts() {
        const sql = `
            SELECT d.*, COUNT(u.id)::int as "userCount"
            FROM departments d
            LEFT JOIN users u ON d.id = u.department_id
            GROUP BY d.id
            ORDER BY d.name ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async getUsers(id) {
        const sql = 'SELECT * FROM users WHERE department_id = $1 ORDER BY full_name ASC';
        const result = await pool.query(sql, [id]);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async create({ name, code, description }) {
        const sql = `
            INSERT INTO departments (name, code, description)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(sql, [name, code, description]);
        return result.rows[0];
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
        const sql = `UPDATE departments SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
        return result.rows[0];
    }
}

module.exports = Department;
