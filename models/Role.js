const pool = require('../config/database');

class Role {
    static async getAll() {
        const sql = `
            SELECT r.*, COUNT(u.id)::int as user_count, COUNT(u.id)::int as "userCount"
            FROM roles r
            LEFT JOIN users u ON r.id = u.role_id
            GROUP BY r.id
            ORDER BY r.name ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async getByName(name) {
        const result = await pool.query('SELECT * FROM roles WHERE name = $1', [name]);
        return result.rows[0] || null;
    }

    static async create({ name, description, icon, color, isSystemRole = false }) {
        const sql = `
            INSERT INTO roles (name, description, icon, color, is_system_role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(sql, [name, description, icon, color, isSystemRole]);
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
        const sql = `UPDATE roles SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING id', [id]);
        return result.rows[0];
    }

    static async updatePermissions(id, permissions) {
        // Assume permissions is stored as a text or json column in PostgreSQL if needed
        // For now, let's just update the permissions column if it exists in schema
        const sql = "UPDATE roles SET permissions = $1 WHERE id = $2 RETURNING *";
        const result = await pool.query(sql, [JSON.stringify(permissions), id]);
        return result.rows[0];
    }
}

module.exports = Role;
