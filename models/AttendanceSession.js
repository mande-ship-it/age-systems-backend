const pool = require('../config/database');

class AttendanceSession {
    static async create(data) {
        const { type, schoolId, sessionDate, facilitator, location, district, month, weekNumber, year, term, semester } = data;
        const sql = `
            INSERT INTO attendance_sessions (type, school_id, session_date, facilitator, location, district, month, week_number, year, term, semester)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const values = [type, schoolId || null, sessionDate || new Date(), facilitator, location, district, month, weekNumber, year, term, semester];
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getAll(filters = {}) {
        let sql = `
            SELECT asess.*, s.name as school_name
            FROM attendance_sessions asess
            LEFT JOIN schools s ON asess.school_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let index = 1;

        if (filters.type) {
            sql += ` AND asess.type = $${index++}`;
            params.push(filters.type);
        }
        if (filters.schoolId) {
            sql += ` AND asess.school_id = $${index++}`;
            params.push(filters.schoolId);
        }
        if (filters.district) {
            sql += ` AND asess.district = $${index++}`;
            params.push(filters.district);
        }
        if (filters.month) {
            sql += ` AND asess.month = $${index++}`;
            params.push(filters.month);
        }
        if (filters.weekNumber) {
            sql += ` AND asess.week_number = $${index++}`;
            params.push(filters.weekNumber);
        }
        if (filters.term) {
            sql += ` AND asess.term = $${index++}`;
            params.push(filters.term);
        }
        if (filters.semester) {
            sql += ` AND asess.semester = $${index++}`;
            params.push(filters.semester);
        }

        sql += ` ORDER BY asess.session_date DESC, asess.created_at DESC`;

        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async findById(id) {
        const sql = `
            SELECT asess.*, s.name as school_name
            FROM attendance_sessions asess
            LEFT JOIN schools s ON asess.school_id = s.id
            WHERE asess.id = $1
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }
}

module.exports = AttendanceSession;
