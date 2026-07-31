const pool = require('../config/database');

class Event {
    static async create({ title, description, category, eventDate, eventTime, location, organizer, targetedParticipants }) {
        const sql = `
            INSERT INTO events (title, description, category, event_date, event_time, location, organizer, targeted_participants, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')
            RETURNING id, title, description, category, event_date as date, event_time as time, location, organizer, targeted_participants as "targetedParticipants", status, created_at
        `;
        const result = await pool.query(sql, [title, description, category, eventDate, eventTime, location, organizer, targetedParticipants]);
        return result.rows[0];
    }

    static async getAll(status = null) {
        let sql = `
            SELECT id, title, description, category, event_date as date, event_time as time, location, organizer, targeted_participants as "targetedParticipants", status, created_at
            FROM events
        `;
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
        const sql = `
            SELECT id, title, description, category, event_date as date, event_time as time, location, organizer, targeted_participants as "targetedParticipants", status, created_at
            FROM events
            WHERE id = $1
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(data)) {
            // Map camelCase to snake_case for DB columns
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
            RETURNING id, title, description, category, event_date as date, event_time as time, location, organizer, targeted_participants as "targetedParticipants", status, created_at
        `;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async approve(id) {
        const sql = `
            UPDATE events
            SET status = 'Active'
            WHERE id = $1
            RETURNING id, title, status
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0];
    }

    static async delete(id) {
        const sql = 'DELETE FROM events WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0];
    }

    static async getEventsInDays(days) {
        const sql = `
            SELECT id, title, description, category, event_date as "eventDate", event_time as "eventTime", location, organizer
            FROM events
            WHERE event_date = CURRENT_DATE + interval '1 day' * $1 AND status = 'Active'
        `;
        const result = await pool.query(sql, [days]);
        return result.rows;
    }

    static async autoMoveToHistory() {
        // Move events where (date + time) <= NOW() and status is 'Active'
        // Since event_date is DATE and event_time is TIME, we combine them
        const sql = `
            UPDATE events
            SET status = 'History', completed_at = NOW()
            WHERE status = 'Active'
            AND (event_date + event_time) <= NOW()
            RETURNING id, title;
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async cleanupHistory() {
        // Delete events from 'History' where completed_at is older than 7 days
        const sql = `
            DELETE FROM events
            WHERE status = 'History'
            AND completed_at <= NOW() - interval '7 days'
            RETURNING id, title;
        `;
        const result = await pool.query(sql);
        return result.rows;
    }
}

module.exports = Event;
