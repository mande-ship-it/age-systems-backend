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
 * Ultimate AI Strategic Engine - Multi-turn Conversation Mode
 * Deeply connected to the entire system for conversational data analysis.
 */
const chatWithAI = async (req, res, next) => {
    try {
        const { messages, message, currentPage = 'Global', targetId } = req.body;

        // Support both single message and full conversation history
        let conversation = messages || [];
        if (conversation.length === 0 && message) {
            conversation.push({ role: 'user', content: message });
        }

        if (conversation.length === 0) {
            return errorResponse(res, 'Messages are required', 400);
        }

        const lastUserMessage = conversation[conversation.length - 1].content;

        // 1. DYNAMIC CONTEXT HARVESTING (Always fresh for the analysis)
        let specificScholarContext = null;
        const scholarMatch = lastUserMessage.match(/AGE-\d+/i) || (targetId && targetId.toString().startsWith('AGE-') ? [targetId] : null);

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

        // 2. GLOBAL SYSTEM AGGREGATIONS
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
            Scholar.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            AcademicResult.aggregate([{ $group: { _id: null, avg: { $avg: "$marks" }, min: { $min: "$marks" }, max: { $max: "$marks" } } }]),
            Attendance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            School.aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }]),
            Sponsor.aggregate([{ $group: { _id: "$status", totalValue: { $sum: "$amount" }, count: { $sum: 1 } } }]),
            Payment.aggregate([{ $group: { _id: "$status", total: { $sum: "$amount" } } }]),
            Event.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            Department.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }]),
            OrganisationProfile.findOne()
        ]);

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

        // 3. CONTEXTUAL SYSTEM PROMPT
        const systemPrompt = `
            ROLE: Senior Strategic AI Data Analyst for ${dbSummary.organisation.name}.
            CONTEXT: You are in a multi-turn conversation with a system operator. You have full real-time read-access to the system database.

            GLOBAL DATABASE STATE:
            ${JSON.stringify(dbSummary, null, 2)}

            ${specificScholarContext ? `
            FOCUSED SCHOLAR ANALYSIS (DETECTED FROM CONTEXT):
            - Identity: ${specificScholarContext.profile.fullName} (${specificScholarContext.profile.scholarId})
            - School: ${specificScholarContext.profile.schoolId?.name || 'Unknown'}
            - Attendance: ${specificScholarContext.attendance}%
            - Academic Performance: ${JSON.stringify(specificScholarContext.academics)}
            - Financial History: ${JSON.stringify(specificScholarContext.financials)}
            ` : ''}

            OPERATIONAL GUIDELINES:
            1. BE CONVERSATIONAL: Remember what was said in previous messages.
            2. DATA-DRIVEN ANSWERS: Always refer to the GLOBAL DATABASE STATE or the FOCUSED SCHOLAR ANALYSIS to provide real information.
            3. markdown FORMATTING: Use bold, lists, and tables for readability.
            4. PROACTIVE INSIGHTS: If the data shows a negative trend, explain why and suggest a fix.
            5. LIMITATIONS: If a user asks for something not in the provided data state, state that you don't have that specific record yet.

            RISK TRIGGER: If you see Attendance < 50% or Marks < 40%, append "[TRIGGER_ALERT: {Scholar Name} - {Reason}]" to your reply.
        `;

        // 4. GROQ API CALL WITH HISTORY
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversation
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.4,
            max_tokens: 4000,
        });

        let aiReply = chatCompletion.choices[0].message.content;

        // 5. AUTOMATED RISK DISPATCH
        const alertMatch = aiReply.match(/\[TRIGGER_ALERT: (.*?)\]/);
        if (alertMatch) {
            const alertContent = alertMatch[1];
            await NotificationService.notifyAll(`🚨 AI-DETECTED RISK: ${alertContent}`, 'warning', 'AI Analytical Engine');
            aiReply = aiReply.replace(/\[TRIGGER_ALERT: .*?\]/, '\n\n⚠️ *Emergency risk alert dispatched to administrators.*');
        }

        return successResponse(res, {
            reply: aiReply,
            context: specificScholarContext ? 'Profile Focus' : 'System Wide'
        }, 'Analysis synchronized.');

    } catch (err) {
        console.error('AI Multi-turn Engine Error:', err.message);
        next(err);
    }
};

module.exports = {
    chatWithAI
};
