import Transcript from '../models/Transcript.js';
import Meeting from '../models/Meeting.js';

const GLADIA_BASE = 'https://api.gladia.io/v2';

const getGladiaHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Gladia-Key': (process.env.GLADIA_API_KEY || '').trim(),
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
                diarization_config: { min_speakers: 1 }
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
        console.log(`[GLADIA] Status Check for ${meetingId}: ${data.status}`);

        if (!r.ok) {
            console.error('[GLADIA] Status Check Failed:', data);
            return res.status(r.status).json(data);
        }

        if (data.status === 'done') {
            // Gladia V2 results are in data.result.transcription
            const result = data.result || data;
            const transcriptData = result.transcription || {};
            const utterances = transcriptData.utterances || [];

            if (utterances.length === 0) {
                console.warn('[GLADIA] Done but no utterances found in result structure', JSON.stringify(data).slice(0, 500));
            }

            const segments = utterances.map(u => ({
                speaker: `Speaker ${u.speaker ?? '?'}`,
                text: u.content || u.text || '',
                startTime: u.start || 0,
                endTime: u.end || 0,
            }));

            const participants = [...new Set(segments.map(s => s.speaker))];

            await Transcript.findOneAndUpdate(
                { meetingId },
                { status: 'completed', segments, participants, rawJson: data }
            );

            console.log(`[GLADIA] Transcription Completed for ${meetingId} | Segments: ${segments.length}`);
            return res.json({ meetingId, participants, segments });
        }

        if (['error', 'failed', 'cancelled'].includes(data.status)) {
            console.error('[GLADIA] Transcription Terminal Failure:', data);
            await Transcript.findOneAndUpdate({ meetingId }, { status: 'failed' });
            return res.status(500).json({ error: 'Transcription job failed on Gladia side', raw: data });
        }

        res.status(202).json({ status: data.status, message: 'Transcription in progress...' });
    } catch (err) {
        console.error('[GLADIA] getTranscript Error:', err);
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

        const prompt = `Create a highly DETAILED and COMPREHENSIVE meeting report from the following transcript.
The report should be structured as JSON and use the exact format below.

IMPORTANT INSTRUCTION: If the transcript is mostly silent, contains very few words, or lacks any meaningful conversation, return EXACTLY this JSON:
{
  "overview": "Not enough data collected during this meeting to create a proper summary. The recording did not capture enough conversational content or was too brief.",
  "keyPoints": [],
  "actionItems": [],
  "decisions": []
}

Otherwise, use this normal format:
{
  "overview": "A detailed narrative overview of the meeting (at least 3-4 paragraphs).",
  "keyPoints": ["Highly detailed point 1 with context", "..."],
  "actionItems": ["Specific task for person X", "..."],
  "decisions": ["Formal decision made", "..."]
}
Ensure the tone is professional yet descriptive. Focus on the relationship between topics discussed.

Meeting participants: ${participants.join(', ') || 'Unknown'}

Transcript:
${transcriptText.slice(0, 32000)}`;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(process.env.GROQ_API_KEY || '').trim()}`,
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
            console.error('[GROQ] Summarization failed:', errBody);
            return res.status(groqRes.status).json({ error: 'AI Summarization failed', raw: errBody });
        }

        const groqData = await groqRes.json();
        const rawText = groqData.choices?.[0]?.message?.content || '';
        console.log(`[GROQ] Raw Output for ${meetingId} (Length: ${rawText.length})`);

        let parsed;
        try {
            const clean = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            console.warn('[GROQ] Failed to parse JSON, falling back to raw output');
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

        console.log(`[GROQ] Summary stored for ${meetingId}`);
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
