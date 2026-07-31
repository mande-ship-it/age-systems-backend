const pool = require('../config/database');
const { successResponse } = require('../utils/response');

/**
 * Get high-fidelity analytics and statistics for the CHATS dashboard
 */
const getDashboardStats = async (req, res, next) => {
    try {
        const { level = 'University', schoolId } = req.query;

        // 1. Unified Summary Counts (Global stats)
        const totalScholarsRes = await pool.query('SELECT COUNT(*) FROM scholars');
        const activeCountRes = await pool.query("SELECT COUNT(*) FROM scholars WHERE status = 'Active'");
        const graduatedCountRes = await pool.query("SELECT COUNT(*) FROM scholars WHERE status IN ('Graduated', 'Alumni')");
        const uniActiveRes = await pool.query("SELECT COUNT(*) FROM scholars WHERE status = 'Active' AND (school_type = 'University' OR school_type = 'Tertiary / University')");
        const secActiveRes = await pool.query("SELECT COUNT(*) FROM scholars WHERE status = 'Active' AND school_type = 'Secondary'");
        const sponsorsCountRes = await pool.query('SELECT COUNT(*) FROM sponsors');

        // ... existing code for retention, cohort, trends, etc. ...

        // 2. Retention Analytics for selected scope
        let retentionSql = `
            SELECT
                COUNT(*) as initial_total,
                COUNT(*) FILTER (WHERE status IN ('Active', 'Graduated')) as current_retained
            FROM scholars
            WHERE (school_type = $1 OR ($1 = 'University' AND school_type = 'Tertiary / University'))
        `;
        const retentionParams = [level];
        if (schoolId) {
            retentionSql += ` AND school_id = $2`;
            retentionParams.push(schoolId);
        }
        const retentionRes = await pool.query(retentionSql, retentionParams);

        const initialTotal = parseInt(retentionRes.rows[0].initial_total || 0);
        const currentRetained = parseInt(retentionRes.rows[0].current_retained || 0);
        const retentionRate = initialTotal > 0 ? ((currentRetained / initialTotal) * 100).toFixed(1) : 100;

        // 3. Cohort Distribution (last 4 cohorts) - Active Only
        let cohortSql = `
            SELECT
                start_year as cohort,
                COUNT(*)::int as count
            FROM scholars
            WHERE (school_type = $1 OR ($1 = 'University' AND school_type = 'Tertiary / University'))
              AND status NOT IN ('Graduated', 'Alumni')
              AND start_year IS NOT NULL
              AND start_year != ''
        `;
        const cohortParams = [level];
        if (schoolId) {
            cohortSql += ` AND school_id = $2`;
            cohortParams.push(schoolId);
        }
        cohortSql += ` GROUP BY start_year ORDER BY start_year DESC LIMIT 4`;
        const cohortRes = await pool.query(cohortSql, cohortParams);

        // 4. Institutional Performance Trends - Active Only
        let trendsSql = `
            SELECT
                ar.year,
                COALESCE(sch.name, s.school_name, 'Unassigned Institution') as school_name,
                AVG(ar.marks)::numeric(5,2) as avg_marks
            FROM academic_results ar
            JOIN scholars s ON ar.scholar_id = s.id
            LEFT JOIN schools sch ON s.school_id = sch.id
            WHERE (s.school_type = $1 OR ($1 = 'University' AND s.school_type = 'Tertiary / University'))
              AND s.status NOT IN ('Graduated', 'Alumni')
        `;
        const trendsParams = [level];
        if (schoolId) {
            trendsSql += ` AND s.school_id = $2`;
            trendsParams.push(schoolId);
        }
        trendsSql += ` GROUP BY ar.year, sch.name, s.school_name ORDER BY ar.year ASC`;
        const trendsRes = await pool.query(trendsSql, trendsParams);

        const performanceSeries = {};
        trendsRes.rows.forEach(row => {
            if (!performanceSeries[row.school_name]) performanceSeries[row.school_name] = [];
            performanceSeries[row.school_name].push({ year: row.year, marks: parseFloat(row.avg_marks) });
        });

        // 5. Regional Impact Distribution - Active Only
        let regionSql = `
            SELECT
                COALESCE(sch.region, s.district, 'Unassigned') as region,
                COUNT(*)::int as count
            FROM scholars s
            LEFT JOIN schools sch ON s.school_id = sch.id
            WHERE (s.school_type = $1 OR ($1 = 'University' AND s.school_type = 'Tertiary / University'))
              AND s.status NOT IN ('Graduated', 'Alumni')
        `;
        const regionParams = [level];
        if (schoolId) {
            regionSql += ` AND s.school_id = $2`;
            regionParams.push(schoolId);
        }
        regionSql += ` GROUP BY 1 ORDER BY count DESC LIMIT 3`;
        const regionRes = await pool.query(regionSql, regionParams);

        // 6. Performance by CHATS Engagement - Active Only
        const engagementRes = await pool.query(`
            WITH scholar_engagement AS (
                SELECT
                    scholar_id,
                    COUNT(*) FILTER (WHERE status = 'present')::float / NULLIF(COUNT(*), 0)::float * 100 as att_rate
                FROM attendance
                GROUP BY scholar_id
            ),
            engagement_yearly AS (
                SELECT
                    ar.year,
                    CASE
                        WHEN COALESCE(se.att_rate, 0) >= 80 THEN 'Frequent'
                        WHEN COALESCE(se.att_rate, 0) >= 50 THEN 'Moderate'
                        ELSE 'Rare'
                    END as eng_level,
                    AVG(ar.marks) as avg_mark
                FROM academic_results ar
                JOIN scholars s ON ar.scholar_id = s.id
                LEFT JOIN scholar_engagement se ON s.id = se.scholar_id
                WHERE (s.school_type = $1 OR ($1 = 'University' AND s.school_type = 'Tertiary / University'))
                  AND s.status NOT IN ('Graduated', 'Alumni')
                ${schoolId ? 'AND s.school_id = $2' : ''}
                GROUP BY 1, 2
            )
            SELECT year, eng_level, AVG(avg_mark)::numeric(5,2) as score
            FROM engagement_yearly
            GROUP BY 1, 2
            ORDER BY year ASC
        `, schoolId ? [level, schoolId] : [level]);

        const engagementSeries = { Frequent: [], Moderate: [], Rare: [] };
        engagementRes.rows.forEach(row => {
            if (engagementSeries[row.eng_level]) {
                engagementSeries[row.eng_level].push({ year: row.year, score: parseFloat(row.score) });
            }
        });

        // 6. Risk Indicators per School
        const riskRes = await pool.query(`
            WITH scholar_stats AS (
                SELECT
                    s.id,
                    s.school_id,
                    COALESCE(sch.name, s.school_name, 'Unassigned Institution') as school_name,
                    AVG(ar.marks) as avg_mark,
                    (SELECT COUNT(*) FILTER (WHERE status = 'present')::float / NULLIF(COUNT(*), 0)::float * 100
                     FROM attendance WHERE scholar_id = s.id) as att_rate
                FROM scholars s
                LEFT JOIN schools sch ON s.school_id = sch.id
                JOIN academic_results ar ON s.id = ar.scholar_id
                WHERE (s.school_type = $1 OR ($1 = 'University' AND s.school_type = 'Tertiary / University'))
                  AND s.status = 'Active'
                GROUP BY s.id, s.school_id, sch.name, s.school_name
            )
            SELECT
                school_name as name,
                AVG(avg_mark)::numeric(5,1) as avg,
                COUNT(*) FILTER (WHERE avg_mark < 50 OR att_rate < 70) as atrisk,
                (COUNT(*) FILTER (WHERE avg_mark >= 50)::float / NULLIF(COUNT(*), 0)::float * 100)::numeric(5,1) as pass_rate,
                CASE
                    WHEN AVG(avg_mark) >= 75 THEN 'low'
                    WHEN AVG(avg_mark) >= 55 THEN 'medium'
                    ELSE 'high'
                END as level
            FROM scholar_stats
            GROUP BY school_name
            ORDER BY atrisk DESC
        `, [level]);

        const schoolsRisks = riskRes.rows.map(r => ({
            ...r,
            reason: r.level === 'low'
                ? `Strong Institutional Integrity with ${r.pass_rate}% pass rate and consistent attendance.`
                : (r.level === 'medium' ? `Moderate Risk: ${r.pass_rate}% pass rate. Flags on scholar attendance/marks.` : `High Alert: ${r.pass_rate}% pass rate. Multi-factor performance decline.`)
        }));

        // 7. Pending Approvals
        const pendingScholars = await pool.query(`
            SELECT full_name as title, 'New scholar registration pending.' as desc, created_at as time
            FROM scholars WHERE status = 'Pending' LIMIT 3
        `);
        const pendingSponsors = await pool.query(`
            SELECT name as title, 'New sponsor profile awaiting verification.' as desc, created_at as time
            FROM sponsors WHERE status = 'Pending' LIMIT 3
        `);

        const approvals = [...pendingScholars.rows, ...pendingSponsors.rows].map(a => ({
            ...a,
            time: formatTimeAgo(a.time)
        }));

        const pendingTotalRes = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM scholars WHERE status = 'Pending') +
                (SELECT COUNT(*) FROM sponsors WHERE status = 'Pending') +
                (SELECT COUNT(*) FROM schools WHERE status = 'Pending') +
                (SELECT COUNT(*) FROM events WHERE status = 'Pending') as count
        `);

        const stats = {
            summary: [
                { label: 'Active Scholars', value: activeCountRes.rows[0].count, icon: 'groups' },
                { label: 'Graduated', value: graduatedCountRes.rows[0].count, icon: 'award' },
                { label: 'University', value: uniActiveRes.rows[0].count, icon: 'bank' },
                { label: 'Secondary', value: secActiveRes.rows[0].count, icon: 'book' },
                { label: 'Sponsors', value: sponsorsCountRes.rows[0].count, icon: 'heart' },
                { label: 'Retention', value: `${retentionRate}%`, icon: 'trend', footnote: `${currentRetained} of ${initialTotal}` }
            ],
            cohorts: cohortRes.rows,
            regions: regionRes.rows,
            performanceSeries: performanceSeries,
            engagementSeries: engagementSeries,
            schools: schoolsRisks,
            approvals: approvals,
            pendingCount: parseInt(pendingTotalRes.rows[0].count || 0)
        };

        return successResponse(res, stats, 'High-fidelity dashboard analytics retrieved.');
    } catch (err) {
        next(err);
    }
};

const formatTimeAgo = (date) => {
    if (!date) return 'Recently';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

const districtCoordinates = {
    'Chitipa': { lat: -9.7024, lng: 33.2687 },
    'Karonga': { lat: -9.9333, lng: 33.9333 },
    'Rumphi': { lat: -11.0167, lng: 33.8667 },
    'Mzimba': { lat: -11.9000, lng: 33.6000 },
    'Nkhata Bay': { lat: -11.6069, lng: 34.2917 },
    'Likoma': { lat: -12.0667, lng: 34.7333 },
    'Kasungu': { lat: -13.0333, lng: 33.4833 },
    'Nkhotakota': { lat: -12.9167, lng: 34.2833 },
    'Ntchisi': { lat: -13.3500, lng: 34.0000 },
    'Dowa': { lat: -13.6500, lng: 33.9333 },
    'Mchinji': { lat: -13.8000, lng: 32.9000 },
    'Lilongwe': { lat: -13.9667, lng: 33.7833 },
    'Salima': { lat: -13.7833, lng: 34.4500 },
    'Dedza': { lat: -14.3833, lng: 34.3333 },
    'Ntcheu': { lat: -14.8167, lng: 34.6333 },
    'Mangochi': { lat: -14.4833, lng: 35.2667 },
    'Balaka': { lat: -14.9833, lng: 34.9500 },
    'Machinga': { lat: -15.1667, lng: 35.3000 },
    'Zomba': { lat: -15.3833, lng: 35.3333 },
    'Chiradzulu': { lat: -15.6833, lng: 35.1500 },
    'Blantyre': { lat: -15.7833, lng: 35.0000 },
    'Mwanza': { lat: -15.6167, lng: 34.5167 },
    'Neno': { lat: -15.4000, lng: 34.6500 },
    'Thyolo': { lat: -16.0667, lng: 35.1333 },
    'Mulanje': { lat: -16.0333, lng: 35.5000 },
    'Phalombe': { lat: -15.8000, lng: 35.6500 },
    'Chikwawa': { lat: -16.0333, lng: 34.8000 },
    'Nsanje': { lat: -16.9167, lng: 35.2667 },
};

/**
 * Get map data for partner districts in Malawi
 */
const getDistrictsMapData = async (req, res, next) => {
    try {
        const sql = `
            SELECT
                district,
                COUNT(*)::int as scholar_count
            FROM scholars
            WHERE district IS NOT NULL AND district != ''
              AND status NOT IN ('Graduated', 'Alumni')
            GROUP BY district
        `;
        const result = await pool.query(sql);

        const mapData = result.rows.map(row => {
            const coords = districtCoordinates[row.district] || { lat: -13.2543, lng: 34.3015 }; // Default center if not found
            return {
                district: row.district,
                scholarCount: row.scholar_count,
                latitude: coords.lat,
                longitude: coords.lng
            };
        });

        return successResponse(res, mapData, 'District map data retrieved.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardStats,
    getDistrictsMapData
};
