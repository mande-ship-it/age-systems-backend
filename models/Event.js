const pool = require('../config/database');

class Event {
    static async create(data) {
        const { title, description, category, eventDate, eventTime, location, organizer, targetedParticipants } = data;
        const sql = `
            INSERT INTO events (title, description, category, event_date, event_time, location, organizer, targeted_participants, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')
            RETURNING *
        `;
        const values = [title, description, category, eventDate, eventTime, location, organizer, targetedParticipants];
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getAll(status = null) {
        let sql = 'SELECT * FROM events';
        const params = [];
        if (status) {
            sql += ' WHERE status = $1';
            params.push(status);
        }
        sql += ' ORDER BY event_date ASC, event_time ASC';
        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async findById(id) {
        const sql = 'SELECT * FROM events WHERE id = $1';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
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
        const sql = `
            UPDATE events
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING *
        `;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async approve(id) {
        const sql = "UPDATE events SET status = 'Active' WHERE id = $1 RETURNING *";
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const sql = 'DELETE FROM events WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async getEventsInDays(days) {
        const sql = `
            SELECT * FROM events
            WHERE status = 'Active'
            AND event_date = CURRENT_DATE + ($1 || ' days')::interval
        `;
        const result = await pool.query(sql, [days]);
        return result.rows;
    }

    static async cleanupHistory() {
        const sql = `
            DELETE FROM events
            WHERE status = 'History'
            AND event_date < CURRENT_DATE - interval '2 days'
            RETURNING id
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async autoMoveToHistory() {
        const sql = `
            UPDATE events
            SET status = 'History', completed_at = CURRENT_TIMESTAMP
            WHERE status = 'Active'
            AND (event_date + event_time) < CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await pool.query(sql);
        return result.rows;
    }
}

module.exports = Event;
