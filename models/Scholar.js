const pool = require('../config/database');

class Scholar {
    static async create({
        userId = null, fullName, email, schoolId, sponsorId, dob, sex, phone, village, district,
        schoolType, schoolName, previousSchool, programType, programName, startYear, endYear, donor,
        status = 'Pending', academicYear,
        guardianName, guardianPhone, guardianEmail, guardianRelation, guardianOccupation
    }) {
        const maxIdRes = await pool.query("SELECT scholar_id FROM scholars WHERE scholar_id LIKE 'AGE-%' ORDER BY id DESC LIMIT 1");
        let nextNumber = 1;
        if (maxIdRes.rowCount > 0) {
            const lastId = maxIdRes.rows[0].scholar_id;
            const lastNumber = parseInt(lastId.split('-')[1]);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        const scholarIdFormatted = `AGE-${nextNumber.toString().padStart(3, '0')}`;

        const sql = `
            INSERT INTO scholars (
                user_id, scholar_id, full_name, email, school_id, sponsor_id, dob, sex, phone, village, district,
                school_type, school_name, previous_school, program_type, program_name, start_year, end_year, donor,
                status, academic_year,
                guardian_name, guardian_phone, guardian_email, guardian_relation, guardian_occupation
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
            RETURNING id
        `;
        const values = [
            userId, scholarIdFormatted, fullName, email, schoolId, sponsorId, dob, sex, phone, village, district,
            schoolType, schoolName, previousSchool, programType, programName, startYear, endYear, donor,
            status, academicYear,
            guardianName, guardianPhone, guardianEmail, guardianRelation, guardianOccupation
        ];
        const result = await pool.query(sql, values);
        return this.findById(result.rows[0].id);
    }

    static async getAll() {
        const sql = `
            SELECT s.*,
                   COALESCE(sch.name, s.school_name) as display_school_name,
                   sp.name as sponsor_name,
                   (CASE
                        WHEN s.end_year ~ '^[0-9]+$' THEN
                            GREATEST(CAST(s.end_year AS INTEGER) - EXTRACT(YEAR FROM CURRENT_DATE), 0)
                        ELSE 0
                   END) as years_remaining
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
            ORDER BY s.full_name ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async findById(id) {
        let sql = `
            SELECT s.*,
                   COALESCE(sch.name, s.school_name) as display_school_name,
                   sp.name as sponsor_name,
                   (CASE
                        WHEN s.end_year ~ '^[0-9]+$' THEN
                            GREATEST(CAST(s.end_year AS INTEGER) - EXTRACT(YEAR FROM CURRENT_DATE), 0)
                        ELSE 0
                   END) as years_remaining
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
        `;

        const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
        if (isNumeric) {
            sql += ' WHERE s.id = $1';
        } else {
            sql += ' WHERE s.scholar_id = $1';
        }

        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async findByUserId(userId) {
        const sql = `
            SELECT s.*,
                   COALESCE(sch.name, s.school_name) as display_school_name,
                   sp.name as sponsor_name
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
            WHERE s.user_id = $1
        `;
        const result = await pool.query(sql, [userId]);
        return result.rows[0] || null;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(data)) {
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            fields.push(`${dbKey} = $${index}`);
            values.push(value);
            index++;
        }

        if (fields.length === 0) return this.findById(id);

        values.push(id);
        const sql = `
            UPDATE scholars 
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING id
        `;

        const result = await pool.query(sql, values);
        return this.findById(result.rows[0].id);
    }

    static async evaluateProgression(scholarId, year) {
        const AcademicResult = require('./AcademicResult');
        const results = await AcademicResult.getByScholar(scholarId, year);
        const scholar = await this.findById(scholarId);

        if (!scholar || results.length === 0) return;

        const terms = [...new Set(results.map(r => r.term).filter(Boolean))];
        const semesters = [...new Set(results.map(r => r.semester).filter(Boolean))];

        const isComplete = (scholar.school_type === 'Secondary' && terms.length === 3) ||
                           (scholar.school_type === 'University' && semesters.length === 2);

        if (!isComplete) {
            console.log(`Progression check for ${scholar.full_name}: Results not yet complete for ${year}.`);
            return;
        }

        const totalMarks = results.reduce((sum, r) => sum + parseFloat(r.marks), 0);
        const average = totalMarks / results.length;
        const passed = average >= 50;

        let nextClass = scholar.academic_year;
        let newStatus = scholar.status;
        let progStatus = passed ? 'Moved' : 'Failed';

        // Calculate max years from start/end year range
        let maxYears = 4; // Default
        if (scholar.start_year && scholar.end_year) {
            const start = parseInt(scholar.start_year);
            const end = parseInt(scholar.end_year);
            if (!isNaN(start) && !isNaN(end)) {
                maxYears = end - start + 1; // e.g., 2026 - 2023 + 1 = 4 years
            }
        }

        if (passed) {
            if (scholar.school_type === 'Secondary') {
                if (scholar.academic_year.startsWith('Form ')) {
                    const num = parseInt(scholar.academic_year.replace('Form ', ''));
                    if (num < 4) {
                        nextClass = `Form ${num + 1}`;
                    } else {
                        nextClass = 'Form 4 (Completed)';
                        newStatus = 'Completed'; // Secondary scholars are marked 'Completed' and effectively removed from active lists
                    }
                }
            } else if (scholar.school_type === 'University') {
                if (scholar.academic_year.startsWith('Year ')) {
                    const num = parseInt(scholar.academic_year.replace('Year ', ''));
                    if (num < maxYears) {
                        nextClass = `Year ${num + 1}`;
                    } else if (num === maxYears) {
                        nextClass = `Year ${num} (Completed)`;
                        newStatus = 'Graduated';
                    } else {
                        newStatus = 'Graduated';
                    }
                }
            }
        }

        const historyEntry = {
            year,
            average: average.toFixed(1),
            result: progStatus,
            from_class: scholar.academic_year,
            to_class: nextClass,
            date: new Date().toISOString()
        };

        const updatedHistory = [...(scholar.progression_history || []), historyEntry];

        const AIService = require('../utils/aiService');
        const aiInsight = await AIService.analyzeScholarProgression(scholar, results, average);
        historyEntry.ai_insight = aiInsight;

        await pool.query(`
            UPDATE scholars
            SET academic_year = $1,
                status = $2,
                progression_status = $3,
                progression_history = $4
            WHERE id = $5
        `, [nextClass, newStatus, progStatus, JSON.stringify(updatedHistory), scholar.id]);

        console.log(`Progression evaluated for ${scholar.full_name}: ${progStatus} to ${nextClass}`);

        const NotificationService = require('../utils/notificationService');
        await NotificationService.notifyAll(
            `🎓 Progression Update: ${scholar.full_name} has ${passed ? 'passed' : 'failed'} the year ${year}. Status: ${progStatus}. AI Insight: ${aiInsight}`,
            passed ? 'success' : 'warning'
        );
    }

    static async getBySchool(schoolId, schoolName = null) {
        let sql = `
            SELECT s.*,
                   COALESCE(sch.name, s.school_name) as display_school_name
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            WHERE s.school_id = $1
        `;
        const params = [schoolId];
        if (schoolName) {
            sql += ' OR s.school_name = $2';
            params.push(schoolName);
        }
        sql += ' ORDER BY s.full_name ASC';
        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async promote(id, nextClass) {
        const sql = `
            UPDATE scholars
            SET academic_year = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(sql, [nextClass, id]);
        return result.rows[0] || null;
    }

    static async approve(id) {
        const sql = `
            UPDATE scholars
            SET status = 'Active'
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM scholars WHERE id = $1 RETURNING id', [id]);
        return result.rows[0] || null;
    }

    static async getUniversityGraduates() {
        const sql = `
            SELECT s.*,
                   COALESCE(sch.name, s.school_name) as display_school_name,
                   sp.name as sponsor_name,
                   i.status as internship_status,
                   i.workplace_name as internship_workplace,
                   (CASE
                        WHEN s.start_year ~ '^[0-9]+$' AND s.end_year ~ '^[0-9]+$' AND EXTRACT(YEAR FROM CURRENT_DATE) > CAST(s.end_year AS INTEGER) THEN 'Year ' || (CAST(s.end_year AS INTEGER) - CAST(s.start_year AS INTEGER) + 1) || ' (Completed)'
                        WHEN s.start_year ~ '^[0-9]+$' THEN 'Year ' || (EXTRACT(YEAR FROM CURRENT_DATE) - CAST(s.start_year AS INTEGER) + 1)
                        ELSE s.academic_year
                   END) as calculated_academic_year
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
            LEFT JOIN internships i ON s.id = i.scholar_id AND i.status = 'Active'
            WHERE s.school_type = 'University'
            AND NOT EXISTS (SELECT 1 FROM internships WHERE scholar_id = s.id)
            AND (
                s.status = 'Graduated'
                OR (
                    s.end_year ~ '^[0-9]+$'
                    AND CAST(s.end_year AS INTEGER) <= EXTRACT(YEAR FROM CURRENT_DATE)
                )
            )
            ORDER BY s.end_year DESC, s.full_name ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async getAlumni() {
        const sql = `
            SELECT s.*,
                   COALESCE(sch.name, s.school_name) as display_school_name,
                   sp.name as sponsor_name,
                   i.workplace_name as internship_workplace,
                   i.status as internship_status,
                   (CASE
                        WHEN s.start_year ~ '^[0-9]+$' AND s.end_year ~ '^[0-9]+$' THEN 'Year ' || (CAST(s.end_year AS INTEGER) - CAST(s.start_year AS INTEGER) + 1) || ' (Alumni)'
                        ELSE 'Alumni'
                   END) as calculated_academic_year
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
            JOIN internships i ON s.id = i.scholar_id
            WHERE s.status = 'Alumni'
            ORDER BY s.end_year DESC, s.full_name ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async autoTransitionGraduates() {
        // 1. Transition University scholars to 'Graduated'
        const uniSql = `
            UPDATE scholars
            SET status = 'Graduated'
            WHERE status = 'Active'
            AND (school_type = 'University' OR school_type = 'Tertiary / University')
            AND end_year ~ '^[0-9]+$'
            AND CAST(end_year AS INTEGER) < EXTRACT(YEAR FROM CURRENT_DATE)
            RETURNING id, scholar_id
        `;
        const uniRes = await pool.query(uniSql);

        // 2. Transition Secondary scholars to 'Completed' (removes them from active tracking)
        const secSql = `
            UPDATE scholars
            SET status = 'Completed'
            WHERE status = 'Active'
            AND school_type = 'Secondary'
            AND end_year ~ '^[0-9]+$'
            AND CAST(end_year AS INTEGER) < EXTRACT(YEAR FROM CURRENT_DATE)
        `;
        await pool.query(secSql);

        return uniRes.rows;
    }

    static async getStats() {
        const sql = `
            SELECT
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status = 'Active')::int as active,
                COUNT(*) FILTER (WHERE status = 'Graduated')::int as graduated,
                COUNT(*) FILTER (WHERE status = 'Alumni')::int as alumni,
                COUNT(*) FILTER (WHERE school_type = 'University' OR school_type = 'Tertiary / University')::int as university,
                COUNT(*) FILTER (WHERE school_type = 'Secondary')::int as secondary
            FROM scholars
        `;
        const result = await pool.query(sql);
        return result.rows[0];
    }
}

module.exports = Scholar;
