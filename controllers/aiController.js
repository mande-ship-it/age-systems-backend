const Groq = require('groq-sdk');
const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
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
        let specificScholarContext = null;

        // Try to identify if a specific scholar is being discussed
        const scholarMatch = message.match(/AGE-\d+/i) || (targetId && targetId.toString().startsWith('AGE-') ? [targetId] : null);

        if (scholarMatch) {
            const sId = scholarMatch[0].toUpperCase();
            const scholar = await Scholar.findOne({ scholarId: sId }).populate('schoolId sponsorId');

            if (scholar) {
                const academics = await AcademicResult.find({ scholarId: scholar._id })
                    .populate('subjectId')
                    .sort({ year: -1 });

                const attendanceCount = await Attendance.countDocuments({ scholarId: scholar._id });
                const presentCount = await Attendance.countDocuments({ scholarId: scholar._id, status: 'present' });
                const attendanceRate = attendanceCount > 0 ? ((presentCount / attendanceCount) * 100).toFixed(1) : '0.0';

                specificScholarContext = {
                    profile: scholar,
                    academics: academics.map(a => ({
                        subject_name: a.subjectId?.name || 'Unknown',
                        marks: a.marks,
                        year: a.year
                    })),
                    attendance: attendanceRate
                };
            }
        }

        // 2. GLOBAL SYSTEM CONTEXT
        const [totalScholars, activeScholars, avgMarksRes, attStats] = await Promise.all([
            Scholar.countDocuments(),
            Scholar.countDocuments({ status: 'Active' }),
            AcademicResult.aggregate([{ $group: { _id: null, avg: { $avg: "$marks" } } }]),
            Attendance.aggregate([
                { $group: {
                    _id: null,
                    present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                    total: { $sum: 1 }
                }}
            ])
        ]);

        const globalAvg = avgMarksRes[0]?.avg?.toFixed(1) || '0.0';
        const globalAtt = attStats[0]?.total > 0 ? ((attStats[0].present / attStats[0].total) * 100).toFixed(1) : '0.0';

        const cohorts = await Scholar.aggregate([
            { $match: { startYear: { $ne: null } } },
            { $group: { _id: "$startYear", count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 4 }
        ]);

        // 3. SYSTEM PROMPT REFINEMENT
        const systemPrompt = `
            ROLE: Senior Strategic AI Analyst for AGE Africa.
            OBJECTIVE: Generate original, smart analytics, planning recommendations, and data-driven reports.

            GLOBAL STATE:
            - Scholars: ${totalScholars} total (${activeScholars} active).
            - Performance: ${globalAvg}% avg marks, ${globalAtt}% attendance.
            - Cohorts: ${cohorts.map(c => `Cohort ${c._id}: ${c.count}`).join(', ')}.

            ${specificScholarContext ? `
            SPECIFIC SCHOLAR UNDER ANALYSIS:
            - Name: ${specificScholarContext.profile.fullName} (${specificScholarContext.profile.scholarId})
            - Institution: ${specificScholarContext.profile.schoolId?.name || 'N/A'}
            - Current Status: ${specificScholarContext.profile.status}
            - Academic Profile: ${JSON.stringify(specificScholarContext.academics)}
            - Attendance Record: ${specificScholarContext.attendance}%
            ` : ''}

            INSTRUCTIONS:
            1. BE SMART & ORIGINAL: When asked to analyze, perform cross-table logic.
            2. GENERATE REPORTS: If asked for a "Report Card" or "Performance Analysis", use a professional markdown structure with ⭐ stars.
            3. PREDICTIVE INSIGHTS: Estimate future performance and graduation likelihood.
            4. ACTIONABLE PLANNING: Suggest specific interventions (CHATs, counseling, school visits).
            5. RISK ALERTS: If you detect a severe risk (Attendance < 50% or Marks < 40%), end your message with "[TRIGGER_ALERT: {Scholar Name} - {Reason}]".
        `;

        // 4. GROQ API CALL
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 3000,
        });

        let aiReply = chatCompletion.choices[0].message.content;

        // 5. AUTOMATED RISK REPORTING
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
