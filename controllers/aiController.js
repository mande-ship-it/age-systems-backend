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
const mongoose = require('mongoose');
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

        let conversation = messages || [];
        if (conversation.length === 0 && message) {
            conversation.push({ role: 'user', content: message });
        }

        if (conversation.length === 0) {
            return errorResponse(res, 'Messages are required', 400);
        }

        const lastUserMessage = conversation[conversation.length - 1].content.toLowerCase();

        // 1. ADVANCED INTENT-BASED DATA RETRIEVAL (The "Search" Layer)
        let customContext = "";

        // Intent: Search for specific scholar by name or ID
        const scholarMatch = lastUserMessage.match(/age-\d+/i) || (targetId && targetId.toString().startsWith('AGE-') ? [targetId] : null);

        if (scholarMatch) {
            const sId = scholarMatch[0].toUpperCase();
            const scholar = await Scholar.findOne({ scholarId: sId }).populate('schoolId sponsorId');
            if (scholar) {
                const [academics, attendanceStats, payments] = await Promise.all([
                    AcademicResult.find({ scholarId: scholar._id }).populate('subjectId').sort({ year: -1 }),
                    Attendance.aggregate([
                        { $match: { scholarId: scholar._id } },
                        { $group: { _id: null, present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }, total: { $sum: 1 } } }
                    ]),
                    Payment.find({ scholarId: scholar._id }).sort({ paymentDate: -1 })
                ]);
                const attRate = attendanceStats[0]?.total > 0 ? ((attendanceStats[0].present / attendanceStats[0].total) * 100).toFixed(1) : '0.0';

                customContext += `\nFOCUSED SCHOLAR BIO-DATA:
                - Name: ${scholar.fullName}
                - ID: ${scholar.scholarId}
                - Age: ${scholar.age || 'N/A'}
                - Sex: ${scholar.sex}
                - Institution: ${scholar.schoolId?.name || 'N/A'}
                - Home District: ${scholar.district}
                - Home Village: ${scholar.village}
                - Assigned Donor: ${scholar.donor}
                - Program: ${scholar.programName} (${scholar.programType})
                - Academic Records: ${JSON.stringify(academics.map(a => ({ sub: a.subjectId?.name, marks: a.marks, yr: a.year, period: a.term || a.semester })))}
                - Attendance Rate: ${attRate}%
                - Financial History: ${JSON.stringify(payments.map(p => ({ amt: p.amount, for: p.purpose, status: p.status })))}`;
            }
        } else if (lastUserMessage.includes('analyze') || lastUserMessage.includes('who is')) {
             // Try searching by name if ID not found
             const nameQuery = lastUserMessage.replace('analyze', '').replace('who is', '').trim();
             if (nameQuery.length > 3) {
                const scholarByName = await Scholar.findOne({ fullName: new RegExp(nameQuery, 'i') }).populate('schoolId');
                if (scholarByName) {
                    customContext += `\nFOUND SCHOLAR BY NAME "${nameQuery}": ID is ${scholarByName.scholarId}. Profile: ${scholarByName.fullName}, School: ${scholarByName.schoolId?.name}, District: ${scholarByName.district}.`;
                }
             }
        }

        // Intent: List Schools
        if (lastUserMessage.includes('list') && (lastUserMessage.includes('school') || lastUserMessage.includes('institution'))) {
            const schools = await School.find({ status: 'Active' }).select('name level district');
            customContext += `\nACTIVE INSTITUTIONS LIST:\n${schools.map(s => `- ${s.name} (${s.level}) in ${s.district}`).join('\n')}`;
        }

        // Intent: District Analysis
        const districtKeywords = ['district', 'lilongwe', 'blantyre', 'zomba', 'mzuzu', 'kasungu', 'dedza', 'machinga', 'mangochi'];
        const districtMentioned = districtKeywords.find(k => lastUserMessage.includes(k));
        if (districtMentioned) {
            const districtStats = await Scholar.aggregate([
                { $group: { _id: "$district", count: { $sum: 1 } } }
            ]);
            customContext += `\nSCHOLAR DISTRIBUTION BY DISTRICT:\n${districtStats.map(d => `- ${d._id}: ${d.count} scholars`).join('\n')}`;
        }

        // 2. GLOBAL SYSTEM AGGREGATIONS
        const [globalScholarStats, globalAcademicStats, globalAttendanceStats, globalSchoolStats, orgRes] = await Promise.all([
            Scholar.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            AcademicResult.aggregate([{ $group: { _id: null, avg: { $avg: "$marks" } } }]),
            Attendance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            School.aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }]),
            OrganisationProfile.findOne()
        ]);

        const dbSummary = {
            organisation: orgRes?.name || 'AGE Africa',
            total_active_scholars: globalScholarStats.find(s => s._id === 'Active')?.count || 0,
            system_avg_marks: globalAcademicStats[0]?.avg?.toFixed(1) || '0.0',
            institutions: globalSchoolStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
        };

        // 3. SYSTEM PROMPT REFINEMENT
        const systemPrompt = `
            ROLE: Senior Strategic AI Analyst for ${dbSummary.organisation}.
            CONTEXT: You are a Conversational Data Analyst with deep-link access to the AGE Africa database.

            GLOBAL SUMMARY:
            - Scholars: ${dbSummary.total_active_scholars} active.
            - Schools: ${JSON.stringify(dbSummary.institutions)}.
            - Academic Baseline: ${dbSummary.system_avg_marks}%.

            ${customContext}

            INSTRUCTIONS:
            1. BE SPECIFIC: Use the lists and data provided above to answer precisely.
            2. SCHOLAR TRACKING: If a user asks about a student, use their BIO-DATA, academics, and attendance to provide a holistic 360-degree analysis.
            3. DISTRICT SEARCH: If asked about a district, find the number of students from the provided "DISTRIBUTION BY DISTRICT" list.
            4. INSTITUTIONAL AUDIT: If asked to list schools, use the "ACTIVE INSTITUTIONS LIST".
            5. TONE: Professional, analytical, yet conversational (like OpenAI).
            6. FORMATTING: Use markdown (tables, bold text, bullet points).

            RISK TRIGGER: If you see Attendance < 50% or Marks < 40%, append "[TRIGGER_ALERT: {Scholar Name} - {Reason}]" to your reply.
        `;

        // 4. GROQ API CALL
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversation
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 4000,
        });

        let aiReply = chatCompletion.choices[0].message.content;

        // 5. AUTOMATED RISK DISPATCH
        const alertMatch = aiReply.match(/\[TRIGGER_ALERT: (.*?)\]/);
        if (alertMatch) {
            const alertContent = alertMatch[1];
            await NotificationService.notifyAll(`🚨 AI-DETECTED RISK: ${alertContent}`, 'warning', 'AI Strategic Engine');
            aiReply = aiReply.replace(/\[TRIGGER_ALERT: .*?\]/, '\n\n⚠️ *System Alert: Risk notified to management.*');
        }

        return successResponse(res, {
            reply: aiReply,
            analysisType: customContext ? 'Deep-Dive' : 'General'
        }, 'Comprehensive real-time analysis generated.');

    } catch (err) {
        console.error('AI Strategy Engine Error:', err.message);
        next(err);
    }
};

module.exports = {
    chatWithAI
};
