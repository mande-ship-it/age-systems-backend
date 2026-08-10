const Groq = require('groq-sdk');
const Scholar = require('../models/Scholar');
const AcademicResult = require('../models/AcademicResult');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const School = require('../models/School');
const Sponsor = require('../models/Sponsor');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const Department = require('../models/Department');
const OrganisationProfile = require('../models/OrganisationProfile');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

/**
 * Ultimate AI Strategic Engine
 * Connected to every core model in the system for deep analysis.
 */
const chatWithAI = async (req, res, next) => {
    try {
        const { message, currentPage = 'Global', targetId } = req.body;

        if (!message) {
            return errorResponse(res, 'Message is required', 400);
        }

        // 1. SCHOLAR CONTEXT (SPECIFIC)
        let specificScholarContext = null;
        const scholarMatch = message.match(/AGE-\d+/i) || (targetId && targetId.toString().startsWith('AGE-') ? [targetId] : null);

        if (scholarMatch) {
            const sId = scholarMatch[0].toUpperCase();
            const scholar = await Scholar.findOne({ scholarId: sId }).populate('schoolId sponsorId');

            if (scholar) {
                const [academics, attendanceStats, payments] = await Promise.all([
                    AcademicResult.find({ scholarId: scholar._id }).populate('subjectId').sort({ year: -1 }),
                    Attendance.aggregate([
                        { $match: { scholarId: scholar._id } },
                        { $group: {
                            _id: null,
                            present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                            total: { $sum: 1 }
                        }}
                    ]),
                    Payment.find({ scholarId: scholar._id }).sort({ paymentDate: -1 })
                ]);

                const attRate = attendanceStats[0]?.total > 0 ? ((attendanceStats[0].present / attendanceStats[0].total) * 100).toFixed(1) : '0.0';

                specificScholarContext = {
                    profile: scholar,
                    academics: academics.map(a => ({ subject: a.subjectId?.name, marks: a.marks, year: a.year, period: a.term || a.semester })),
                    attendance: attRate,
                    financials: payments.map(p => ({ amount: p.amount, purpose: p.purpose, status: p.status }))
                };
            }
        }

        // 2. GLOBAL SYSTEM AGGREGATIONS (The "Whole Database" View)
        const [
            globalScholarStats,
            globalAcademicStats,
            globalAttendanceStats,
            globalSchoolStats,
            globalSponsorStats,
            globalPaymentStats,
            globalEventStats,
            globalDeptStats,
            orgRes
        ] = await Promise.all([
            // Scholar distribution
            Scholar.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            // Academic performance
            AcademicResult.aggregate([{ $group: { _id: null, avg: { $avg: "$marks" }, min: { $min: "$marks" }, max: { $max: "$marks" } } }]),
            // Attendance overall
            Attendance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            // Institutional distribution
            School.aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }]),
            // Sponsorship data
            Sponsor.aggregate([{ $group: { _id: "$status", totalValue: { $sum: "$amount" }, count: { $sum: 1 } } }]),
            // Financial flow
            Payment.aggregate([{ $group: { _id: "$status", total: { $sum: "$amount" } } }]),
            // Operational activity
            Event.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            // Human resources
            Department.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }]),
            // Organisation Branding
            OrganisationProfile.findOne()
        ]);

        // Construct simplified context for the LLM
        const dbSummary = {
            organisation: orgRes ? { name: orgRes.name, type: orgRes.type } : { name: 'AGE Africa', type: 'Non-Profit' },
            scholars: globalScholarStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            academics: {
                average: globalAcademicStats[0]?.avg?.toFixed(1) || '0.0',
                range: `${globalAcademicStats[0]?.min || 0}% - ${globalAcademicStats[0]?.max || 0}%`
            },
            attendance: globalAttendanceStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            institutions: globalSchoolStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            sponsorship: globalSponsorStats.reduce((acc, curr) => ({ ...acc, [curr._id]: { count: curr.count, value: curr.totalValue } }), {}),
            financials: globalPaymentStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.total }), {}),
            events: globalEventStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            departments: globalDeptStats[0]?.count || 0
        };

        // 3. SYSTEM PROMPT REFINEMENT
        const systemPrompt = `
            ROLE: Senior Strategic AI Data Analyst for ${dbSummary.organisation.name}.
            CONTEXT: You have full real-time read-access to the ${dbSummary.organisation.name} Scholar Management System database.

            GLOBAL DATABASE STATE:
            ${JSON.stringify(dbSummary, null, 2)}

            ${specificScholarContext ? `
            FOCUSED SCHOLAR ANALYSIS:
            - Identity: ${specificScholarContext.profile.fullName} (${specificScholarContext.profile.scholarId})
            - School: ${specificScholarContext.profile.schoolId?.name || 'Unknown'}
            - Attendance: ${specificScholarContext.attendance}%
            - Academic Performance: ${JSON.stringify(specificScholarContext.academics)}
            - Financial History: ${JSON.stringify(specificScholarContext.financials)}
            ` : ''}

            OPERATIONAL GUIDELINES:
            1. DATA INTERPRETATION: Look for correlations (e.g., does low attendance correlate with low marks?).
            2. STRATEGIC PLANNING: Use the database state to suggest where resources should be allocated (e.g., which schools need more support?).
            3. FINANCIAL AUDIT: If asked about money, refer to the "financials" and "sponsorship" data provided.
            4. SMART REPORTING: Format reports in professional markdown with clear headings, bold text, and appropriate emojis.
            5. RISK DETECTION: Proactively flag anomalies you see in the data provided.

            If you detect a severe risk to a scholar's progression (Attendance < 50% or Marks < 40%), append "[TRIGGER_ALERT: {Scholar Name} - {Reason}]" to your reply.
        `;

        // 4. GROQ API CALL
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2, // Lower temperature for more analytical/factual responses
            max_tokens: 4000,
        });

        let aiReply = chatCompletion.choices[0].message.content;

        // 5. AUTOMATED RISK DISPATCH
        const alertMatch = aiReply.match(/\[TRIGGER_ALERT: (.*?)\]/);
        if (alertMatch) {
            const alertContent = alertMatch[1];
            await NotificationService.notifyAll(`🚨 AI-DETECTED RISK: ${alertContent}`, 'warning', 'AI Analytical Engine');
            aiReply = aiReply.replace(/\[TRIGGER_ALERT: .*?\]/, '\n\n⚠️ *System Note: An emergency risk alert has been dispatched to administrators based on this analysis.*');
        }

        return successResponse(res, {
            reply: aiReply,
            context: specificScholarContext ? 'Individual Profile' : 'System-Wide Aggregate'
        }, 'Comprehensive system-wide analysis generated.');

    } catch (err) {
        console.error('AI Analytical Engine Error:', err.message);
        next(err);
    }
};

module.exports = {
    chatWithAI
};
