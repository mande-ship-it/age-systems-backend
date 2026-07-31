const pool = require('../config/database');

class Notification {
    static async create({ userId, message, type = 'info', actorName = 'System' }) {
        const sql = `
            INSERT INTO notifications (user_id, message, type, actor_name)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(sql, [userId, message, type, actorName]);
        return result.rows[0];
    }

    static async getByUser(userId) {
        const sql = `
            SELECT * FROM notifications 
            WHERE user_id = $1 OR user_id IS NULL
            ORDER BY created_at DESC
        `;
        const result = await pool.query(sql, [userId]);
        return result.rows;
    }

    static async markAsRead(id) {
        const sql = `
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = $1 
            RETURNING *
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async markAllAsRead(userId) {
        const sql = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1 OR user_id IS NULL
        `;
        const result = await pool.query(sql, [userId]);
        return result.rowCount;
    }

    static async delete(id) {
        const sql = 'DELETE FROM notifications WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }
}

module.exports = Notification;
