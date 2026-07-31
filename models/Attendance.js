const pool = require('../config/database');

class Attendance {
    static async getGlobalStats() {
        const sql = `
            SELECT
                COUNT(*) FILTER (WHERE status = 'present') as present,
                COUNT(*) FILTER (WHERE status = 'absent') as absent,
                COUNT(*) FILTER (WHERE status = 'late') as late,
                COUNT(*) FILTER (WHERE status = 'excused') as excused,
                COUNT(*) as total
            FROM attendance
        `;
        const result = await pool.query(sql);
        return result.rows[0];
    }

    static async getMonthlyTrends() {
        const sql = `
            SELECT
                TO_CHAR(DATE_TRUNC('week', asess.session_date), 'YYYY-MM-DD') as week_start,
                COUNT(*) FILTER (WHERE a.status = 'present')::FLOAT / COUNT(*)::FLOAT * 100 as attendance_rate
            FROM attendance a
            JOIN attendance_sessions asess ON a.session_id = asess.id
            GROUP BY week_start
            ORDER BY week_start ASC
            LIMIT 4
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async getSchoolWiseSummary() {
        const sql = `
            SELECT
                s.name as school_name,
                COUNT(DISTINCT sch.id) as active_scholars,
                COUNT(a.id) FILTER (WHERE a.status = 'present') as present_logs,
                ROUND(COUNT(a.id) FILTER (WHERE a.status = 'present')::NUMERIC / NULLIF(COUNT(a.id), 0)::NUMERIC * 100, 1) as avg_rate
            FROM schools s
            LEFT JOIN scholars sch ON sch.school_id = s.id
            LEFT JOIN attendance a ON a.scholar_id = sch.id
            GROUP BY s.name
            ORDER BY avg_rate DESC NULLS LAST
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async getAlerts() {
        return [
            { title: "Low Enrollment Participation", subtitle: "Providence High dropped to 65%", type: "danger" },
            { title: "Consistency Issue", subtitle: "Sarah Kambewa missed 3 sessions", type: "warning" },
            { title: "High Performance", subtitle: "Kamuzu Academy reached 100% rate", type: "success" }
        ];
    }

    static async getReportBySchool(schoolId, filters = {}) {
        // Step 1: Build the Session Filter for the JOIN
        let sessionFilterSql = "";
        const sessionParams = [];
        let pIdx = 2; // Start from 2 because $1 is reserved for schoolId

        if (filters.month) {
            sessionFilterSql += ` AND asess.month = $${pIdx++}`;
            sessionParams.push(filters.month);
        }
        if (filters.term) {
            sessionFilterSql += ` AND asess.term = $${pIdx++}`;
            sessionParams.push(filters.term);
        }
        if (filters.semester) {
            sessionFilterSql += ` AND asess.semester = $${pIdx++}`;
            sessionParams.push(filters.semester);
        }
        if (filters.week_number) {
            sessionFilterSql += ` AND asess.week_number = $${pIdx++}`;
            sessionParams.push(filters.week_number);
        }
        if (filters.year) {
            sessionFilterSql += ` AND asess.year = $${pIdx++}`;
            sessionParams.push(filters.year);
        }

        const sql = `
            SELECT
                COALESCE(u.full_name, s.full_name) as scholar_name,
                s.scholar_id as age_id,
                sch.level as school_level,
                COUNT(a.id) FILTER (WHERE a.status = 'present') as present_count,
                COUNT(asess.id) as total_sessions,
                COALESCE(ARRAY_AGG(asess.session_date ORDER BY asess.session_date DESC) FILTER (WHERE asess.id IS NOT NULL), '{}') as session_dates
            FROM scholars s
            LEFT JOIN users u ON s.user_id = u.id
            JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN attendance_sessions asess ON asess.school_id = sch.id ${sessionFilterSql}
            LEFT JOIN attendance a ON a.session_id = asess.id AND a.scholar_id = s.id
            WHERE s.school_id = $1
            GROUP BY s.id, u.full_name, sch.level
            ORDER BY scholar_name ASC
        `;

        const result = await pool.query(sql, [schoolId, ...sessionParams]);

        // Post-process to add targets and status
        return result.rows.map(row => {
            let target = 0;
            const level = row.school_level || '';
            const presentCount = parseInt(row.present_count || 0);

            if (level.includes('Secondary')) {
                if (filters.month) {
                    target = 4;
                } else if (filters.term) {
                    target = 8;
                } else {
                    target = 12;
                }
            } else if (level.includes('University') || level.includes('Tertiary')) {
                if (filters.month) {
                    target = 1;
                } else if (filters.semester) {
                    target = 3;
                } else {
                    target = 6;
                }
            }

            const attendanceRate = target > 0 ? (presentCount / target) * 100 : 0;
            let status = 'Excellent';
            if (attendanceRate < 50) status = 'Critical';
            else if (attendanceRate < 80) status = 'Below Target';
            else if (attendanceRate < 100) status = 'Good';

            const periodLabel = filters.month || filters.term || filters.semester || 'Annual';

            return {
                ...row,
                target,
                periodLabel,
                attendanceRate: Math.round(Math.min(100, attendanceRate)),
                status
            };
        });
    }

    static async getSummaryByScholar(scholarId) {
        const sql = `
            SELECT
                COUNT(*) FILTER (WHERE status = 'present') as present,
                COUNT(*) FILTER (WHERE status = 'absent') as absent,
                COUNT(*) FILTER (WHERE status = 'late') as late,
                COUNT(*) as total_sessions,
                ARRAY_AGG(JSON_BUILD_OBJECT(
                    'date', asess.session_date,
                    'status', a.status,
                    'notes', a.notes
                ) ORDER BY asess.session_date DESC) as history
            FROM attendance a
            JOIN attendance_sessions asess ON a.session_id = asess.id
            WHERE a.scholar_id = $1
            GROUP BY a.scholar_id
        `;
        const result = await pool.query(sql, [scholarId]);
        return result.rows[0] || { present: 0, absent: 0, late: 0, total_sessions: 0, history: [] };
    }
}

module.exports = Attendance;
