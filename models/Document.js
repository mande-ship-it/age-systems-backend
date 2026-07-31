const pool = require('../config/database');

class Document {
    static async create({ scholarId, name, path, type }) {
        const sql = `
            INSERT INTO documents (scholar_id, name, path, type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(sql, [scholarId, name, path, type]);
        return result.rows[0];
    }

    static async getByScholar(scholarId) {
        const sql = `
            SELECT * FROM documents 
            WHERE scholar_id = $1 
            ORDER BY created_at DESC
        `;
        const result = await pool.query(sql, [scholarId]);
        return result.rows;
    }

    static async delete(id) {
        const sql = 'DELETE FROM documents WHERE id = $1 RETURNING id, path';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }
}

module.exports = Document;
