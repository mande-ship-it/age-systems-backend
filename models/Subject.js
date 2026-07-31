const pool = require('../config/database');

class Subject {
    static async create({ name, code, level, details, notes }) {
        const sql = `
            INSERT INTO subjects (name, code, level, details, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(sql, [name, code, level, details, notes]);
        return result.rows[0];
    }

    static async getAll(level = null) {
        let sql = 'SELECT * FROM subjects';
        const params = [];
        if (level) {
            sql += ' WHERE level = $1';
            params.push(level);
        }
        sql += ' ORDER BY name ASC';
        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async findByCode(code) {
        const result = await pool.query('SELECT * FROM subjects WHERE code = $1', [code]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM subjects WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async findByNameAndLevel(name, level) {
        const result = await pool.query('SELECT * FROM subjects WHERE LOWER(name) = LOWER($1) AND level = $2', [name, level]);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM subjects WHERE id = $1 RETURNING id', [id]);
        return result.rows[0] || null;
    }
}

module.exports = Subject;
