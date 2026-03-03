import Transcript from '../models/Transcript.js';

const VEXA_BASE = 'https://api.cloud.vexa.ai';
const VEXA_KEY = (process.env.VEXA_API_KEY || '').trim();
const GROQ_KEY = (process.env.GROQ_API_KEY || '').trim();

const vexaHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': VEXA_KEY,
};

// POST /api/vexa/start
export const startBot = async (req, res) => {
    try {
        const hostId = req.auth.userId;
        const { meetingId, participants, origin } = req.body;
        if (!meetingId) return res.status(400).json({ error: 'meetingId required' });

        const baseUrl = origin || process.env.FRONTEND_URL || 'https://smart-sps.vercel.app';
        const botToken = VEXA_KEY.slice(-10);
        const meetingUrl = `${baseUrl}/meeting/${meetingId}?bot_token=${botToken}`;

        if (process.env.FRONTEND_URL?.includes('localhost')) {
            console.warn(`[VEXA] Warning: Bots cannot join localhost URLs (${meetingUrl}). Use a public URL (e.g. via ngrok) for testing.`);
        }

        console.log(`[VEXA] Starting bot for ${meetingId} | Platform: google_meet | URL: ${meetingUrl}`);

        const r = await fetch(`${VEXA_BASE}/bots`, {
            method: 'POST',
            headers: vexaHeaders,
            body: JSON.stringify({
                platform: 'google_meet', // Recommended platform for generic bots if custom isn't supported
                meeting_url: meetingUrl,
                native_meeting_id: meetingId,
                bot_name: 'SmartMeet AI',
            }),
        });

        const data = await r.json();
        if (!r.ok) {
            console.error('[VEXA] Bot Start Failed:', JSON.stringify(data, null, 2));
            return res.status(r.status).json({
                error: data?.detail || data?.error || 'Vexa start failed',
                raw: data
            });
        }

        console.log(`[VEXA] Bot started successfully. ID: ${data.id || data.bot_id}`);

        await Transcript.findOneAndUpdate(
            { meetingId },
            { meetingId, hostId, botId: data.id || data.bot_id || null, participants: participants || [], segments: [], rawJson: null },
            { upsert: true, new: true }
        );

        res.json({ success: true, botId: data.id || data.bot_id, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/vexa/stop/:meetingId
export const stopBot = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const r = await fetch(`${VEXA_BASE}/bots/google_meet/${meetingId}`, {
            method: 'DELETE',
            headers: vexaHeaders,
        });
        const data = r.status === 204 ? { success: true } : await r.json().catch(() => ({}));
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/vexa/transcript/:meetingId
export const getTranscript = async (req, res) => {
    try {
        const hostId = req.auth.userId;
        const { meetingId } = req.params;

        const r = await fetch(`${VEXA_BASE}/transcripts/google_meet/${meetingId}`, {
            headers: vexaHeaders,
        });

        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error(`Vexa Transcript Error [${r.status}]:`, err);

            // If Vexa returns 422, it usually means the bot is still processing or no data was captured.
            // We'll return a cleaner message to the frontend.
            const message = r.status === 422 ? 'Transcript processing - please wait a moment' : (err?.detail || 'Transcript not ready');
            return res.status(r.status).json({ error: message, raw: err });
        }

        const raw = await r.json();

        const segments = (raw.transcript || raw.segments || raw.utterances || []).map(seg => ({
            speaker: seg.speaker || seg.channel || 'Unknown',
            text: seg.text || seg.content || '',
            startTime: seg.start_time ?? seg.start ?? 0,
            endTime: seg.end_time ?? seg.end ?? 0,
        }));

        const participants = [...new Set(segments.map(s => s.speaker))];

        await Transcript.findOneAndUpdate(
            { meetingId },
            { meetingId, hostId, segments, participants, rawJson: raw },
            { upsert: true, new: true }
        );

        res.json({ meetingId, participants, segments, raw });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/vexa/saved/:meetingId
export const getSavedTranscript = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const doc = await Transcript.findOne({ meetingId }).lean();
        if (!doc) return res.status(404).json({ error: 'No transcript saved yet' });
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/vexa/summarize
// Body: { meetingId, segments, participants }
// Calls Groq llama-3.1-8b-instant, parses structured summary, saves to DB
export const summarize = async (req, res) => {
    try {
        const { meetingId, segments = [], participants = [] } = req.body;
        if (!meetingId) return res.status(400).json({ error: 'meetingId required' });
        if (segments.length === 0) return res.status(400).json({ error: 'No transcript segments to summarize' });

        // Build readable transcript text
        const transcriptText = segments
            .map(s => `[${s.speaker}]: ${s.text}`)
            .join('\n');

        const prompt = `You are a professional meeting summarizer. Analyze this meeting transcript and respond ONLY with valid JSON in exactly this format:

{
  "overview": "2-3 sentence summary of what this meeting was about",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionItems": ["action 1", "action 2"],
  "decisions": ["decision 1", "decision 2"]
}

Rules:
- keyPoints: 3-7 most important discussion points
- actionItems: concrete next steps assigned or implied (empty array if none)
- decisions: formal decisions made (empty array if none)
- Be specific and concise
- Do NOT include any text outside the JSON

Meeting participants: ${participants.join(', ') || 'Unknown'}

Transcript:
${transcriptText.slice(0, 12000)}`; // Groq 8k context safe limit

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1024,
                temperature: 0.3,
            }),
        });

        if (!groqRes.ok) {
            const errBody = await groqRes.json().catch(() => ({}));
            console.error('Groq API Error:', errBody);
            return res.status(groqRes.status).json({ error: 'AI Summarization failed', raw: errBody });
        }

        const groqData = await groqRes.json();
        const rawText = groqData.choices?.[0]?.message?.content || '';

        // Parse JSON from Groq response (strip any markdown fences)
        let parsed;
        try {
            const clean = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            // Fallback — return raw text as overview
            parsed = { overview: rawText, keyPoints: [], actionItems: [], decisions: [] };
        }

        const summaryDoc = {
            overview: parsed.overview || '',
            keyPoints: parsed.keyPoints || [],
            actionItems: parsed.actionItems || [],
            decisions: parsed.decisions || [],
            raw: rawText,
            generatedAt: new Date(),
        };

        // Persist to DB
        await Transcript.findOneAndUpdate(
            { meetingId },
            { $set: { summary: summaryDoc } },
            { upsert: true }
        );

        res.json({ meetingId, summary: summaryDoc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/vexa/status/:meetingId
export const getStatus = async (req, res) => {
    try {
        const doc = await Transcript.findOne({ meetingId: req.params.meetingId });
        res.json({ running: !!(doc && doc.botId) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
