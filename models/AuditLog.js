const pool = require('../config/database');

class AuditLog {
    static async log({ userId, action, details, actorName = 'System' }) {
        const sql = `
            INSERT INTO audit_logs (user_id, action, details, actor_name)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(sql, [userId, action, details, actorName]);
        return result.rows[0];
    }

    static async getAll() {
        const sql = `
            SELECT a.*, u.full_name, u.email 
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }
}

module.exports = AuditLog;
