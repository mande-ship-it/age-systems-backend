const pool = require('../config/database');

class AcademicResult {
    static async upsert({ scholarId, subjectId, marks, gradeLetter, gradePoint, year, term, semester }) {
        const sql = `
            INSERT INTO academic_results (scholar_id, subject_id, marks, grade_letter, grade_point, year, term, semester)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (scholar_id, subject_id, year, term, semester)
            DO UPDATE SET
                marks = EXCLUDED.marks,
                grade_letter = EXCLUDED.grade_letter,
                grade_point = EXCLUDED.grade_point
            RETURNING *
        `;
        const values = [scholarId, subjectId, marks, gradeLetter, gradePoint, year, term, semester];
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getByScholar(scholarId, year = null) {
        let sql = `
            SELECT r.*, s.name as subject_name, s.code as subject_code
            FROM academic_results r
            JOIN subjects s ON r.subject_id = s.id
            WHERE r.scholar_id = $1
        `;
        const params = [scholarId];
        if (year) {
            sql += ' AND r.year = $2';
            params.push(year);
        }
        sql += ' ORDER BY r.year DESC, r.term ASC, r.semester ASC';
        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async getBySchool(schoolName, year = null, term = null, semester = null) {
        let sql = `
            SELECT r.*, s.name as subject_name, s.code as subject_code,
                   u.full_name as scholar_name, sch.scholar_id as age_id
            FROM academic_results r
            JOIN subjects s ON r.subject_id = s.id
            JOIN scholars sch ON r.scholar_id = sch.id
            JOIN users u ON sch.user_id = u.id
            WHERE sch.school_name = $1 OR (SELECT name FROM schools WHERE id = sch.school_id) = $1
        `;
        const params = [schoolName];
        let idx = 2;
        if (year) {
            sql += ` AND r.year = $${idx++}`;
            params.push(year);
        }
        if (term) {
            sql += ` AND r.term = $${idx++}`;
            params.push(term);
        }
        if (semester) {
            sql += ` AND r.semester = $${idx++}`;
            params.push(semester);
        }
        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async getStatsByYear(year) {
        const sql = `
            SELECT r.*, s.level as subject_level, sch.school_type
            FROM academic_results r
            JOIN subjects s ON r.subject_id = s.id
            JOIN scholars sch ON r.scholar_id = sch.id
            WHERE r.year = $1
        `;
        const result = await pool.query(sql, [year]);
        return result.rows;
    }
}

module.exports = AcademicResult;
