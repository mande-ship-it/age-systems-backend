const pool = require('../config/database');

class Report {
    /**
     * 1. Attendance Reports Data
     */
    static async getAttendanceReportData(monthYear) {
        const statsSql = `
            SELECT
                ROUND(AVG(attendance_rate)::numeric, 1) as avg_rate,
                (SELECT COUNT(*) FROM (
                    SELECT scholar_id FROM attendance GROUP BY scholar_id HAVING COUNT(*) = COUNT(*) FILTER (WHERE status = 'present')
                ) as perfect) as perfect_attendance,
                (SELECT COUNT(*) FROM (
                    SELECT scholar_id FROM attendance GROUP BY scholar_id HAVING (COUNT(*) FILTER (WHERE status = 'present')::FLOAT / NULLIF(COUNT(*), 0)::FLOAT) < 0.5
                ) as critical) as critical_lows
            FROM (
                SELECT session_id, COUNT(*) FILTER (WHERE status = 'present')::FLOAT / NULLIF(COUNT(*), 0)::FLOAT * 100 as attendance_rate
                FROM attendance GROUP BY session_id
            ) as session_rates;
        `;

        const trendsSql = `
            SELECT TO_CHAR(session_date, 'W') as week, ROUND(AVG(attendance_rate)::numeric, 1) as rate
            FROM (
                SELECT session_id, asess.session_date, COUNT(*) FILTER (WHERE a.status = 'present')::FLOAT / NULLIF(COUNT(*), 0)::FLOAT * 100 as attendance_rate
                FROM attendance a
                JOIN attendance_sessions asess ON a.session_id = asess.id
                GROUP BY session_id, asess.session_date
            ) as rates
            GROUP BY week ORDER BY week;
        `;

        const reasonsSql = `
            SELECT status as reason, ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0))::numeric, 1) as percentage
            FROM attendance WHERE status != 'present'
            GROUP BY status LIMIT 4;
        `;

        const scholarSummarySql = `
            SELECT u.full_name,
                   COUNT(*) FILTER (WHERE a.status = 'present') as present,
                   COUNT(*) FILTER (WHERE a.status = 'absent') as absent,
                   ROUND((COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC / NULLIF(COUNT(a.*), 0)::NUMERIC * 100)::numeric, 1) as rate
            FROM attendance a
            JOIN scholars s ON a.scholar_id = s.id
            JOIN users u ON s.user_id = u.id
            GROUP BY u.full_name ORDER BY rate DESC LIMIT 10;
        `;

        const [stats, trends, reasons, scholars] = await Promise.all([
            pool.query(statsSql),
            pool.query(trendsSql),
            pool.query(reasonsSql),
            pool.query(scholarSummarySql)
        ]);

        return {
            metrics: stats.rows[0] || { avg_rate: 0, perfect_attendance: 0, critical_lows: 0 },
            trends: trends.rows,
            reasons: reasons.rows,
            scholars: scholars.rows
        };
    }

    /**
     * 3. Scholar Reports Data
     */
    static async getScholarReportData(period, type) {
        const metricsSql = `
            SELECT
                COUNT(*) FILTER (WHERE s.status = 'Active') as total_active,
                COALESCE(ROUND(AVG(ar.marks)::numeric, 1), 0) as avg_performance,
                COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'Completed'), 0) as total_disbursed
            FROM scholars s
            LEFT JOIN academic_results ar ON s.id = ar.scholar_id;
        `;

        const distributionSql = `
            SELECT
                CASE
                    WHEN marks >= 80 THEN 'Exceeding Expectations (80%+)'
                    WHEN marks >= 65 THEN 'Meeting Expectations (65-79%)'
                    WHEN marks >= 50 THEN 'Approaching Expectations (50-64%)'
                    ELSE 'Needs Support (<50%)'
                END as label,
                ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0))::numeric, 1) as percentage
            FROM academic_results GROUP BY label;
        `;

        const regionalSql = `
            SELECT district as region, COUNT(*) as count
            FROM scholars GROUP BY district;
        `;

        const listSql = `
            SELECT u.full_name as name, COALESCE(sch.name, s.school_name) as institution,
                   COALESCE(ROUND(AVG(ar.marks)::numeric, 1), 0) as avg_mark, s.status
            FROM scholars s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN academic_results ar ON s.id = ar.scholar_id
            GROUP BY u.full_name, sch.name, s.school_name, s.status
            ORDER BY avg_mark DESC
            LIMIT 10;
        `;

        const [metrics, distribution, regional, list] = await Promise.all([
            pool.query(metricsSql),
            pool.query(distributionSql),
            pool.query(regionalSql),
            pool.query(listSql)
        ]);

        return {
            metrics: metrics.rows[0],
            distribution: distribution.rows,
            regional: regional.rows,
            scholars: list.rows
        };
    }

    /**
     * 4. School Reports Data
     */
    static async getSchoolReportData(level) {
        const metricsSql = `
            SELECT
                (SELECT COUNT(*) FROM schools) as partner_schools,
                (SELECT COUNT(*) FROM scholars) as total_enrollment,
                COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'Pending'), 0) as pending_fees
        `;

        const typeSql = `
            SELECT level as type, ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0))::numeric, 1) as percentage
            FROM schools GROUP BY level;
        `;

        const standingSql = `
            SELECT
                CASE
                    WHEN avg_marks >= 75 THEN 'Excellent'
                    WHEN avg_marks >= 50 THEN 'Satisfactory'
                    ELSE 'Support Required'
                END as standing,
                COUNT(*) as count
            FROM (
                SELECT school_id, AVG(marks) as avg_marks
                FROM academic_results ar
                JOIN scholars s ON ar.scholar_id = s.id
                GROUP BY school_id
            ) as school_stats
            GROUP BY standing;
        `;

        const tableSql = `
            SELECT s.name, s.level, COALESCE(ROUND(AVG(ar.marks)::numeric, 1), 0) as avg_mark,
                CASE
                    WHEN AVG(ar.marks) >= 75 THEN 'Excellent'
                    WHEN AVG(ar.marks) >= 50 THEN 'Satisfactory'
                    ELSE 'Support Required'
                END as standing
            FROM schools s
            LEFT JOIN scholars sch ON s.id = sch.school_id
            LEFT JOIN academic_results ar ON sch.id = ar.scholar_id
            GROUP BY s.name, s.level
            ORDER BY avg_mark DESC NULLS LAST;
        `;

        const [metrics, types, standings, table] = await Promise.all([
            pool.query(metricsSql),
            pool.query(typeSql),
            pool.query(standingSql),
            pool.query(tableSql)
        ]);

        return {
            metrics: metrics.rows[0],
            types: types.rows,
            standings: standings.rows,
            schools: table.rows
        };
    }

    /**
     * 5. Sponsor Reports Data
     */
    static async getSponsorReportData(region) {
        const metricsSql = `
            SELECT
                (SELECT COUNT(*) FROM sponsors WHERE status = 'Active') as active_sponsors,
                COALESCE((SELECT SUM(amount) FROM sponsors), 0) as total_funding,
                (SELECT COUNT(*) FROM scholars WHERE sponsor_id IS NOT NULL) as impacted_scholars
        `;

        const typeSql = `
            SELECT sponsorship_type as type, ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0))::numeric, 1) as percentage
            FROM sponsors GROUP BY sponsorship_type;
        `;

        const tableSql = `
            SELECT name as donor_name, amount as contribution,
                   (SELECT COUNT(*) FROM scholars WHERE sponsor_id = s.id) as scholars,
                   'Annual' as cycle
            FROM sponsors s ORDER BY amount DESC;
        `;

        const [metrics, types, table] = await Promise.all([
            pool.query(metricsSql),
            pool.query(typeSql),
            pool.query(tableSql)
        ]);

        return {
            metrics: metrics.rows[0],
            types: types.rows,
            sponsors: table.rows
        };
    }
}

module.exports = Report;
