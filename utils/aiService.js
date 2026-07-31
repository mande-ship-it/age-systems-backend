const Groq = require('groq-sdk');

class AIService {
    static async analyzeScholarProgression(scholar, results, average) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return "AI analysis unavailable (API key missing).";

        const groq = new Groq({ apiKey });

        try {
            const prompt = `
                Analyze the academic performance of scholar ${scholar.full_name}.
                School Type: ${scholar.school_type}
                Current Year: ${scholar.academic_year}
                Year Results Average: ${average.toFixed(1)}%
                Detailed Results: ${JSON.stringify(results.map(r => ({ subject: r.subject_name, marks: r.marks })))}

                Provide a short 2-sentence professional insight on their progression.
                Mention if they are "Exceeding Expectations", "On Track", or "Needs Urgent Intervention".
            `;

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 150
            });

            return chatCompletion.choices[0].message.content.trim();
        } catch (err) {
            console.error('Groq AI Error:', err.message);
            return "AI Analysis failed to generate.";
        }
    }
}

module.exports = AIService;
