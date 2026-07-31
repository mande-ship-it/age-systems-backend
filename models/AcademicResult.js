const pool = require('../config/database');

class AcademicResult {
    static async upsert({ scholarId, subjectId, marks, gradeLetter, gradePoint, year, term, semester }) {
        const Scholar = require('./Scholar');
        const scholar = await Scholar.findById(scholarId);
        if (!scholar) throw new Error('Scholar not found.');

        // Enforce result limits:
        // Secondary: 3 terms (1, 2, 3)
        // University: 2 semesters (1, 2)
        if (scholar.school_type === 'Secondary' && term && (parseInt(term) < 1 || parseInt(term) > 3)) {
            throw new Error('Secondary school only allows 3 terms.');
        }
        if (scholar.school_type === 'University' && semester && (parseInt(semester) < 1 || parseInt(semester) > 2)) {
            throw new Error('University only allows 2 semesters.');
        }

        // Check if year already has full results (to block further entry if required)
        // Actually, we usually allow UPDATING, so ON CONFLICT handles that.
        // But we should prevent adding NEW terms/semesters if they exceed the limit.

        // Check if this specific term/semester already exists (for updates)
        const checkSql = `
            SELECT id FROM academic_results
            WHERE scholar_id = $1 AND subject_id = $2 AND year = $3
            AND (term = $4 OR semester = $5)
        `;
        const existingResult = await pool.query(checkSql, [scholarId, subjectId, year, term || null, semester || null]);

        // If it doesn't exist, check if we are adding a NEW term/semester that would exceed the count
        if (existingResult.rowCount === 0) {
            const countSql = `
                SELECT COUNT(DISTINCT COALESCE(term, semester)) as count
                FROM academic_results
                WHERE scholar_id = $1 AND year = $2
            `;
            const countRes = await pool.query(countSql, [scholarId, year]);
            const currentCount = parseInt(countRes.rows[0].count);

            const limit = scholar.school_type === 'Secondary' ? 3 : 2;
            if (currentCount >= limit) {
                throw new Error(`Academic results for ${year} are already complete (${currentCount}/${limit} periods recorded). No more periods can be added.`);
            }
        }

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

        // After recording, check if this triggers a progression evaluation
        // We'll evaluate if the scholar has finished the year (all terms/semesters recorded)
        await Scholar.evaluateProgression(scholarId, year);

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

    static async getBySchool(schoolIdentifier, year = null, term = null, semester = null) {
        let sql = `
            SELECT r.*, s.name as subject_name, s.code as subject_code,
                   sch.full_name as scholar_name, sch.scholar_id as age_id
            FROM academic_results r
            JOIN subjects s ON r.subject_id = s.id
            JOIN scholars sch ON r.scholar_id = sch.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (schoolIdentifier) {
            const isNumeric = !isNaN(schoolIdentifier) && !isNaN(parseFloat(schoolIdentifier));
            if (isNumeric) {
                sql += ` AND sch.school_id = $${idx++}`;
                params.push(schoolIdentifier);
            } else {
                sql += ` AND (sch.school_name = $${idx++} OR (SELECT name FROM schools WHERE id = sch.school_id) = $${params.length + 1})`;
                params.push(schoolIdentifier);
            }
        }

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

        sql += ` ORDER BY u.full_name ASC, r.year DESC`;

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
