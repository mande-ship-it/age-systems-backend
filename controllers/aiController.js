const Groq = require('groq-sdk');
const pool = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

/**
 * Perfected AI Analytical Engine
 * Deep-linked to scholar details, academics, institutions and risk reporting.
 */
const chatWithAI = async (req, res, next) => {
    try {
        const { message, currentPage = 'Global', targetId } = req.body;

        if (!message) {
            return errorResponse(res, 'Message is required', 400);
        }

        // 1. DYNAMIC DATA HARVESTING
        // We gather global context, but also look for specific targets if mentioned or provided
        let specificScholarContext = null;
        let institutionalPerformance = null;

        // Try to identify if a specific scholar is being discussed (by ID in body or mentioned in text)
        const scholarMatch = message.match(/AGE-\d+/i) || (targetId && targetId.toString().startsWith('AGE-') ? [targetId] : null);

        if (scholarMatch) {
            const sId = scholarMatch[0].toUpperCase();
            const sRes = await pool.query(`
                SELECT s.*, u.full_name, u.email, sch.name as school_full_name, sp.name as sponsor_full_name
                FROM scholars s
                JOIN users u ON s.user_id = u.id
                LEFT JOIN schools sch ON s.school_id = sch.id
                LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
                WHERE s.scholar_id = $1
            `, [sId]);

            if (sRes.rowCount > 0) {
                const scholar = sRes.rows[0];
                // Fetch academic history for this specific scholar
                const aRes = await pool.query(`
                    SELECT subject_name, marks, academic_year, term, semester
                    FROM academic_results
                    WHERE scholar_id = $1
                    ORDER BY academic_year DESC, created_at DESC
                `, [scholar.id]);

                // Fetch attendance rate
                const attRes = await pool.query(`
                    SELECT COUNT(*) FILTER (WHERE status = 'present')::float / NULLIF(COUNT(*), 0)::float * 100 as rate
                    FROM attendance WHERE scholar_id = $1
                `, [scholar.id]);

                specificScholarContext = {
                    profile: scholar,
                    academics: aRes.rows,
                    attendance: attRes.rows[0]?.rate?.toFixed(1) || '0.0'
                };
            }
        }

        // 2. GLOBAL SYSTEM CONTEXT (Always provided for grounding)
        const [stats, cohorts, risks] = await Promise.all([
            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM scholars) as total,
                    (SELECT COUNT(*) FROM scholars WHERE status = 'Active') as active,
                    (SELECT AVG(marks)::numeric(5,2) FROM academic_results) as global_avg,
                    (SELECT COUNT(*) FILTER (WHERE status = 'present')::float / NULLIF(COUNT(*), 0)::float * 100 FROM attendance) as global_att
            `),
            pool.query(`SELECT start_year, COUNT(*)::int FROM scholars GROUP BY start_year ORDER BY start_year DESC LIMIT 4`),
            pool.query(`
                SELECT u.full_name, COALESCE(sch.name, s.school_name) as school, ar.marks,
                       (SELECT COUNT(*) FILTER (WHERE status = 'present')::float / NULLIF(COUNT(*), 0)::float * 100
                        FROM attendance WHERE scholar_id = s.id) as att_rate
                FROM academic_results ar
                JOIN scholars s ON ar.scholar_id = s.id
                JOIN users u ON s.user_id = u.id
                LEFT JOIN schools sch ON s.school_id = sch.id
                WHERE ar.marks < 50 OR EXISTS (
                    SELECT 1 FROM attendance a WHERE a.scholar_id = s.id GROUP BY a.scholar_id
                    HAVING COUNT(*) FILTER (WHERE a.status = 'present')::float / COUNT(*)::float * 100 < 70
                )
                ORDER BY ar.marks ASC LIMIT 5
            `)
        ]);

        // 3. SYSTEM PROMPT REFINEMENT
        const systemPrompt = `
            ROLE: Senior Strategic AI Analyst for AGE Africa.
            OBJECTIVE: Generate original, smart analytics, planning recommendations, and data-driven reports.

            GLOBAL STATE:
            - Scholars: ${stats.rows[0].total} total (${stats.rows[0].active} active).
            - Performance: ${stats.rows[0].global_avg}% avg marks, ${stats.rows[0].global_att?.toFixed(1)}% attendance.
            - Cohorts: ${cohorts.rows.map(c => `Cohort ${c.start_year}: ${c.count}`).join(', ')}.

            ${specificScholarContext ? `
            SPECIFIC SCHOLAR UNDER ANALYSIS:
            - Name: ${specificScholarContext.profile.full_name} (${specificScholarContext.profile.scholar_id})
            - Institution: ${specificScholarContext.profile.school_full_name}
            - Current Status: ${specificScholarContext.profile.status}
            - Academic Profile: ${JSON.stringify(specificScholarContext.academics)}
            - Attendance Record: ${specificScholarContext.attendance}%
            ` : ''}

            CRITICAL RISKS DETECTED:
            ${risks.rows.map(r => `- ${r.full_name} (${r.school}): ${r.marks}% Marks, ${r.att_rate?.toFixed(1)}% Att.`).join('\n')}

            INSTRUCTIONS:
            1. BE SMART & ORIGINAL: When asked to analyze, perform cross-table logic. (e.g. "Scholars from district X are struggling with attendance").
            2. GENERATE REPORTS: If asked for a "Report Card" or "Performance Analysis", use a professional markdown structure with ⭐ stars. Include GPA/Points calculations based on marks.
            3. PREDICTIVE INSIGHTS: Estimate future performance and graduation likelihood based on current academic trajectory and attendance trends.
            4. ACTIONABLE PLANNING: Suggest specific interventions (CHATs, counseling, school visits).
            5. RISK ALERTS: If you detect a severe risk during analysis (Attendance < 50% or Marks < 40%), you MUST end your message with "[TRIGGER_ALERT: {Scholar Name} - {Reason}]".
            6. INSTITUTIONAL AUDIT: If asked to audit a school, analyze the average scores and flags of all students in that school.
        `;

        // 4. GROQ API CALL
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3, // Lower for higher precision in reporting
            max_tokens: 3000,
        });

        let aiReply = chatCompletion.choices[0].message.content;

        // 5. AUTOMATED RISK REPORTING (NOTIFICATION LINK)
        // If AI detects a risk and uses the trigger tag, we push to system notifications
        const alertMatch = aiReply.match(/\[TRIGGER_ALERT: (.*?)\]/);
        if (alertMatch) {
            const alertContent = alertMatch[1];
            await NotificationService.notifyAll(`⚠️ AI RISK ALERT: ${alertContent}`, 'warning', 'AI Strategic Engine');
            aiReply = aiReply.replace(/\[TRIGGER_ALERT: .*?\]/, '✅ *A system alert has been automatically dispatched to program managers regarding this risk.*');
        }

        return successResponse(res, {
            reply: aiReply,
            contextType: specificScholarContext ? 'Individual' : 'Aggregated'
        }, 'Comprehensive AI strategy generated.');

    } catch (err) {
        console.error('Groq AI Strategic Engine Error:', err.message);
        next(err);
    }
};

module.exports = {
    chatWithAI
};
