const pool = require('../config/database');

class Role {
    static async getAll() {
        const result = await pool.query('SELECT * FROM roles ORDER BY id ASC');
        return result.rows;
    }

    static async getAllWithCounts() {
        const sql = `
            SELECT r.*, COUNT(u.id)::int as user_count
            FROM roles r
            LEFT JOIN users u ON r.id = u.role_id
            GROUP BY r.id
            ORDER BY r.id ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async getByName(name) {
        if (!name) return null;
        const result = await pool.query('SELECT * FROM roles WHERE LOWER(name) = LOWER($1)', [name.trim()]);
        return result.rows[0] || null;
    }

    static async create({ name, description, icon, color, isSystemRole = false, permissions = {} }) {
        const sql = `
            INSERT INTO roles (name, description, icon, color, is_system_role, permissions)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await pool.query(sql, [name, description, icon, color, isSystemRole, JSON.stringify(permissions)]);
        return result.rows[0];
    }

    static async update(id, data) {
        const { name, description, icon, color, permissions } = data;

        let sql = 'UPDATE roles SET ';
        const params = [];
        const updates = [];
        let i = 1;

        if (name !== undefined) { updates.push(`name = $${i++}`); params.push(name); }
        if (description !== undefined) { updates.push(`description = $${i++}`); params.push(description); }
        if (icon !== undefined) { updates.push(`icon = $${i++}`); params.push(icon); }
        if (color !== undefined) { updates.push(`color = $${i++}`); params.push(color); }
        if (permissions !== undefined) { updates.push(`permissions = $${i++}`); params.push(JSON.stringify(permissions)); }

        if (updates.length === 0) return this.findById(id);

        sql += updates.join(', ');
        sql += ` WHERE id = $${i} RETURNING *`;
        params.push(id);

        const result = await pool.query(sql, params);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING id', [id]);
        return result.rows[0];
    }

    static async updatePermissions(id, permissions) {
        const sql = 'UPDATE roles SET permissions = $1 WHERE id = $2 RETURNING *';
        const result = await pool.query(sql, [JSON.stringify(permissions), id]);
        return result.rows[0];
    }
}

module.exports = Role;
