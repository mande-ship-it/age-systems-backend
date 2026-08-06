const pool = require('../config/database');

class Scholar {
    static async create(data) {
        const {
            userId, fullName, email, schoolId, sponsorId, dob, sex, phone, village, district,
            schoolType, schoolName, previousSchool, programType, programName, startYear, endYear, donor,
            status = 'Pending', academicYear, guardianName, guardianPhone, guardianEmail, guardianRelation, guardianOccupation
        } = data;

        // Auto-generate scholar_id like AGE-001
        const maxIdRes = await pool.query("SELECT scholar_id FROM scholars WHERE scholar_id LIKE 'AGE-%' ORDER BY id DESC LIMIT 1");
        let nextNumber = 1;
        if (maxIdRes.rowCount > 0) {
            const lastId = maxIdRes.rows[0].scholar_id;
            const match = lastId.match(/AGE-(\d+)/);
            if (match) nextNumber = parseInt(match[1]) + 1;
        }
        const scholarIdFormatted = `AGE-${nextNumber.toString().padStart(3, '0')}`;

        const sql = `
            INSERT INTO scholars (
                user_id, scholar_id, full_name, email, school_id, sponsor_id, dob, sex, phone, village, district,
                school_type, school_name, previous_school, program_type, program_name, start_year, end_year, donor,
                status, academic_year, guardian_name, guardian_phone, guardian_email, guardian_relation, guardian_occupation
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
            RETURNING *
        `;
        const values = [
            userId || null, scholarIdFormatted, fullName, email, schoolId || null, sponsorId || null, dob, sex, phone, village, district,
            schoolType, schoolName, previousSchool, programType, programName, startYear, endYear, donor,
            status, academicYear, guardianName, guardianPhone, guardianEmail, guardianRelation, guardianOccupation
        ];
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getAll() {
        const sql = `
            SELECT s.*,
                   COALESCE(sch.name, s.school_name) as display_school_name,
                   sp.name as sponsor_name
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
                   sp.name as sponsor_name
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
        `;

        // Handle both DB ID (serial) and AGE-ID (string)
        const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
        if (isNumeric) {
            sql += ' WHERE s.id = $1';
        } else {
            sql += ' WHERE s.scholar_id = $1';
        }

        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const [key, value] of Object.entries(data)) {
            // Map camelCase to snake_case
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            fields.push(`${dbKey} = $${index++}`);
            values.push(value);
        }

        if (fields.length === 0) return this.findById(id);

        values.push(id);
        const sql = `
            UPDATE scholars
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING *
        `;
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async approve(id) {
        const sql = "UPDATE scholars SET status = 'Active' WHERE id = $1 RETURNING *";
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const sql = 'DELETE FROM scholars WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async getBySchool(schoolId, schoolName = null) {
        let sql = `
            SELECT s.*, u.full_name, u.email,
                   COALESCE(sch.name, s.school_name) as display_school_name
            FROM scholars s
            LEFT JOIN users u ON s.user_id = u.id
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
}

module.exports = Scholar;
