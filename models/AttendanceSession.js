const pool = require('../config/database');
const { getAttendanceMetadata } = require('../utils/helpers');

class AttendanceSession {
    static async create(data) {
        const client = await pool.connect();
        try {
            const {
                type, schoolId, sessionDate, facilitator, location,
                year, month, week_number, term, semester,
                entries
            } = data;

            // 1. Validate School exists and get level
            const schoolCheck = await client.query('SELECT id, level FROM schools WHERE id = $1', [schoolId]);
            if (schoolCheck.rows.length === 0) {
                const error = new Error(`School with ID ${schoolId} does not exist.`);
                error.statusCode = 400;
                throw error;
            }
            const schoolLevel = schoolCheck.rows[0].level;

            // Use provided metadata or auto-detect
            const meta = getAttendanceMetadata(sessionDate || new Date(), schoolLevel);
            const finalMonth = month || meta.month.toString();
            const finalWeek = week_number || meta.weekNumber;
            const finalYear = year || new Date(sessionDate || new Date()).getFullYear();
            const finalTerm = term || meta.term;
            const finalSemester = semester || meta.semester;

            // 2. Validate all Scholars exist
            if (entries && entries.length > 0) {
                const scholarIds = entries.map(e => e.scholarId);
                const scholarCheck = await client.query(
                    'SELECT id FROM scholars WHERE id = ANY($1)',
                    [scholarIds]
                );

                if (scholarCheck.rows.length !== scholarIds.length) {
                    const foundIds = scholarCheck.rows.map(r => r.id);
                    const missingIds = scholarIds.filter(id => !foundIds.includes(id));
                    const error = new Error(`Scholars with IDs [${missingIds.join(', ')}] do not exist in the database.`);
                    error.statusCode = 400;
                    throw error;
                }
            }

            await client.query('BEGIN');

            // 3. Create the session
            const sessionSql = `
                INSERT INTO attendance_sessions (type, school_id, session_date, facilitator, location, month, week_number, year, term, semester)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            const sessionResult = await client.query(sessionSql, [
                type,
                schoolId,
                sessionDate || new Date(),
                facilitator,
                location,
                finalMonth,
                finalWeek,
                finalYear,
                finalTerm,
                finalSemester
            ]);
            const session = sessionResult.rows[0];

            // 4. Create attendance entries
            if (entries && entries.length > 0) {
                const entrySql = `
                    INSERT INTO attendance (session_id, scholar_id, status, notes)
                    VALUES ($1, $2, $3, $4)
                `;
                for (const entry of entries) {
                    await client.query(entrySql, [session.id, entry.scholarId, entry.status, entry.notes || '']);
                }
            }

            await client.query('COMMIT');
            return session;
        } catch (err) {
            if (client) await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getAll(filters = {}) {
        let sql = `
            SELECT asess.*, s.name as school_name, s.level as school_level,
                   (SELECT COUNT(*) FROM attendance WHERE session_id = asess.id AND status = 'present') as present_count,
                   (SELECT COUNT(*) FROM attendance WHERE session_id = asess.id) as total_count
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
        if (filters.schoolName) {
            sql += ` AND s.name ILIKE $${index++}`;
            params.push(`%${filters.schoolName}%`);
        }
        if (filters.month) {
            sql += ` AND asess.month = $${index++}`;
            params.push(filters.month);
        }
        if (filters.week_number) {
            sql += ` AND asess.week_number = $${index++}`;
            params.push(filters.week_number);
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
        const sessionSql = `
            SELECT asess.*, s.name as school_name
            FROM attendance_sessions asess
            LEFT JOIN schools s ON asess.school_id = s.id
            WHERE asess.id = $1
        `;
        const sessionResult = await pool.query(sessionSql, [id]);
        if (sessionResult.rows.length === 0) return null;

        const entriesSql = `
            SELECT a.*, u.full_name as scholar_name, s.academic_year as program_or_grade
            FROM attendance a
            JOIN scholars s ON a.scholar_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.session_id = $1
            ORDER BY u.full_name ASC
        `;
        const entriesResult = await pool.query(entriesSql, [id]);

        return {
            ...sessionResult.rows[0],
            entries: entriesResult.rows
        };
    }
}

module.exports = AttendanceSession;
