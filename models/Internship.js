const pool = require('../config/database');

class Internship {
    static async create({ scholarId, workplaceName, location, supervisor, startDate, endDate, details }) {
        const sql = `
            INSERT INTO internships (scholar_id, workplace_name, location, supervisor, start_date, end_date, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const result = await pool.query(sql, [scholarId, workplaceName, location, supervisor, startDate, endDate, details]);
        return result.rows[0];
    }

    static async getAll() {
        const sql = `
            SELECT i.*, s.full_name as scholar_name, s.scholar_id as age_id, s.email as scholar_email
            FROM internships i
            JOIN scholars s ON i.scholar_id = s.id
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async findByScholarId(scholarId) {
        const result = await pool.query('SELECT * FROM internships WHERE scholar_id = $1', [scholarId]);
        return result.rows[0] || null;
    }

    static async updateStatus(id, status) {
        const result = await pool.query('UPDATE internships SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        return result.rows[0];
    }

    static async autoProcessCompletions() {
        // Marks internships as 'Completed' if the end_date has passed
        const sql = `
            UPDATE internships
            SET status = 'Completed'
            WHERE status = 'Active'
            AND end_date < CURRENT_DATE
            RETURNING id, scholar_id
        `;
        const result = await pool.query(sql);
        return result.rows;
    }
}

module.exports = Internship;
