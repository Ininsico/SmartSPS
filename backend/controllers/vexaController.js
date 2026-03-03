import Transcript from '../models/Transcript.js';
import Meeting from '../models/Meeting.js';

const GLADIA_BASE = 'https://api.gladia.io/v2';
const GLADIA_KEY = (process.env.GLADIA_API_KEY || '').trim();
const GROQ_KEY = (process.env.GROQ_API_KEY || '').trim();

const getGladiaHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Gladia-Key': GLADIA_KEY,
});

// POST /api/vexa/start
// We'll repurpose this to start Gladia if a recordingUrl is provided
export const startBot = async (req, res) => {
    try {
        const { meetingId, recordingUrl } = req.body;
        if (!recordingUrl) return res.status(400).json({ error: 'recordingUrl required for AI notes' });

        console.log(`[GLADIA] Starting transcription for ${meetingId} | URL: ${recordingUrl}`);

        const r = await fetch(`${GLADIA_BASE}/transcription`, {
            method: 'POST',
            headers: getGladiaHeaders(),
            body: JSON.stringify({
                audio_url: recordingUrl,
                diarization: true,
                language_behavior: 'automatic',
            }),
        });

        const data = await r.json();
        if (!r.ok) {
            console.error('[GLADIA] Start Failed:', data);
            return res.status(r.status).json({ error: data.message || 'Gladia start failed', raw: data });
        }

        await Transcript.findOneAndUpdate(
            { meetingId },
            { meetingId, status: 'processing', transcriptionId: data.id, audioUrl: recordingUrl },
            { upsert: true, new: true }
        );

        res.json({ success: true, transcriptionId: data.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/vexa/stop/:meetingId (Legacy/Placeholder)
export const stopBot = async (req, res) => {
    res.json({ success: true, note: 'Gladia handles processing automatically' });
};

// GET /api/vexa/transcript/:meetingId
export const getTranscript = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const doc = await Transcript.findOne({ meetingId });
        if (!doc || !doc.transcriptionId) return res.status(404).json({ error: 'No transcription found' });

        if (doc.status === 'completed' && doc.segments?.length > 0) {
            return res.json({ meetingId, participants: doc.participants, segments: doc.segments });
        }

        const r = await fetch(`${GLADIA_BASE}/transcription/${doc.transcriptionId}`, {
            headers: getGladiaHeaders(),
        });

        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);

        if (data.status === 'done') {
            const transcriptData = data.transcription;
            const utterances = transcriptData.utterances || [];

            const segments = utterances.map(u => ({
                speaker: `Speaker ${u.speaker ?? '?'}`,
                text: u.content || '',
                startTime: u.start || 0,
                endTime: u.end || 0,
            }));

            const participants = [...new Set(segments.map(s => s.speaker))];

            await Transcript.findOneAndUpdate(
                { meetingId },
                { status: 'completed', segments, participants, rawJson: data }
            );

            return res.json({ meetingId, participants, segments });
        }

        res.status(202).json({ status: data.status, message: 'Transcription in progress...' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/vexa/saved/:meetingId
export const getSavedTranscript = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const doc = await Transcript.findOne({ meetingId }).lean();
        const meeting = await Meeting.findOne({ roomId: meetingId }).select('chat').lean();

        if (!doc && !meeting) return res.json({ found: false, note: 'No data saved yet' });
        res.json({ ...doc, chat: meeting?.chat || [], found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/vexa/summarize
export const summarize = async (req, res) => {
    try {
        const { meetingId, segments = [], participants = [] } = req.body;
        if (!meetingId) return res.status(400).json({ error: 'meetingId required' });
        if (segments.length === 0) return res.status(400).json({ error: 'No transcript segments to summarize' });

        const transcriptText = segments
            .map(s => `[${s.speaker}]: ${s.text}`)
            .join('\n');

        const prompt = `Summarize this meeting transcript as JSON. Output ONLY JSON.
Format:
{
  "overview": "Concise summary",
  "keyPoints": ["point 1", "..."],
  "actionItems": ["task 1", "..."],
  "decisions": ["decision 1", "..."]
}
Keep points brief.

Meeting participants: ${participants.join(', ') || 'Unknown'}

Transcript:
${transcriptText.slice(0, 12000)}`;

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
            return res.status(groqRes.status).json({ error: 'AI Summarization failed', raw: errBody });
        }

        const groqData = await groqRes.json();
        const rawText = groqData.choices?.[0]?.message?.content || '';

        let parsed;
        try {
            const clean = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
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
        res.json({ running: !!(doc && doc.status === 'processing') });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
