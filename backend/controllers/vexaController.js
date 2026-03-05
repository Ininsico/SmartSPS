import Transcript from '../models/Transcript.js';
import Meeting from '../models/Meeting.js';

const GLADIA_BASE = 'https://api.gladia.io/v2';

const getGladiaHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Gladia-Key': (process.env.GLADIA_API_KEY || '').trim(),
});

/**
 * Shared internal function to generate summary without requiring a request/response context
 */
const generateSummaryInternal = async (meetingId, segments) => {
    try {
        const transcriptText = segments.map(s => `[${s.speaker}]: ${s.text}`).join('\n');
        const prompt = `Act as an accurate meeting scribe. Generate a report BASED ONLY ON THE PROVIDED TRANSCRIPT.

STRICT RULES:
1. NO HALLUCINATIONS. If a role, decision, or action item is not explicitly mentioned, return an empty array [].
2. NO PLACEHOLDERS. Do not use names like "John Doe" or generic tasks unless they are in the transcript.
3. BE REALISTIC. If the meeting is a casual chat, reflect that in the overview. Don't force jargon.
4. IDENTITY. Use the actual speaker names from the transcript.

JSON FORMAT:
{
  "overview": "Truthful summary of the actual conversation.",
  "roles": [{ "person": "Real Name", "role": "Title", "responsibilities": ["Actual task"] }],
  "keyPoints": ["Actual point discussed"],
  "actionItems": ["Actual task assigned"],
  "decisions": ["Actual decision made"]
}

Transcript:
${transcriptText.slice(0, 5000)}`;

        const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                response_format: { type: 'json_object' }
            }),
        });

        if (gRes.ok) {
            const gData = await gRes.json();
            const parsed = JSON.parse(gData.choices[0]?.message?.content || '{}');

            const toStringArr = (arr) => Array.isArray(arr) ? arr.map(i => typeof i === 'string' ? i : JSON.stringify(i)) : [];

            await Transcript.findOneAndUpdate(
                { meetingId },
                {
                    $set: {
                        summary: {
                            overview: String(parsed.overview || 'Summarization complete.'),
                            roles: Array.isArray(parsed.roles) ? parsed.roles : [],
                            keyPoints: toStringArr(parsed.keyPoints),
                            actionItems: toStringArr(parsed.actionItems),
                            decisions: toStringArr(parsed.decisions),
                            generatedAt: new Date()
                        }
                    }
                }
            );
            console.log(`[INTERNAL-SUM] Success for ${meetingId}`);
            return true;
        }
    } catch (e) {
        console.error('[INTERNAL-SUM] Failed:', e.message);
    }
    return false;
};

/**
 * Background worker to poll Gladia and trigger summary
 */
const pollAndProcess = async (meetingId, transcriptionId) => {
    console.log(`[BG-TASK] Started for ${meetingId} (ID: ${transcriptionId})`);
    const wait = (ms) => new Promise(res => setTimeout(res, ms));
    const maxAttempts = 60; // 10 minutes max (10s intervals)

    for (let i = 0; i < maxAttempts; i++) {
        try {
            await wait(10000); // Wait 10s between polls
            const r = await fetch(`${GLADIA_BASE}/transcription/${transcriptionId}`, { headers: getGladiaHeaders() });
            if (!r.ok) continue;

            const data = await r.json();
            if (data.status === 'done') {
                const result = data.result || data;
                const utterances = result.transcription?.utterances || [];
                const segments = utterances.map(u => ({
                    speaker: `Speaker ${u.speaker ?? '?'}`,
                    text: u.content || u.text || '',
                    startTime: u.start || 0,
                    endTime: u.end || 0,
                }));
                const participants = [...new Set(segments.map(s => s.speaker))];

                await Transcript.findOneAndUpdate(
                    { meetingId },
                    { status: 'completed', segments, participants }
                );

                await generateSummaryInternal(meetingId, segments);
                console.log(`[BG-TASK] Fully completed for ${meetingId}`);
                break;
            } else if (data.status === 'error') {
                console.error(`[BG-TASK] Gladia reported error for ${meetingId}`);
                await Transcript.findOneAndUpdate({ meetingId }, { status: 'error' });
                break;
            }
        } catch (err) {
            console.error(`[BG-TASK] Iteration ${i} failed:`, err.message);
        }
    }
};

export const startBot = async (req, res) => {
    try {
        const { meetingId, recordingUrl } = req.body;
        if (!recordingUrl) return res.status(400).json({ error: 'recordingUrl required' });

        const r = await fetch(`${GLADIA_BASE}/transcription`, {
            method: 'POST',
            headers: getGladiaHeaders(),
            body: JSON.stringify({
                audio_url: recordingUrl,
                diarization_config: { min_speakers: 1 }
            }),
        });

        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);

        await Transcript.findOneAndUpdate(
            { meetingId },
            { meetingId, status: 'processing', transcriptionId: data.id, audioUrl: recordingUrl },
            { upsert: true }
        );

        // LEAVE IT IN THE BACKGROUND. Sever will poll Gladia and summarize.
        pollAndProcess(meetingId, data.id);

        res.json({ success: true, transcriptionId: data.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const stopBot = async (req, res) => res.json({ success: true });

export const getTranscript = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const doc = await Transcript.findOne({ meetingId });
        if (!doc || !doc.transcriptionId) return res.status(404).json({ error: 'Not found' });

        if (doc.status === 'completed' && doc.segments?.length > 0) {
            return res.json({ meetingId, participants: doc.participants, segments: doc.segments, summary: doc.summary });
        }

        const r = await fetch(`${GLADIA_BASE}/transcription/${doc.transcriptionId}`, { headers: getGladiaHeaders() });
        const data = await r.json();

        if (data.status === 'done') {
            const result = data.result || data;
            const utterances = result.transcription?.utterances || [];
            const segments = utterances.map(u => ({
                speaker: `Speaker ${u.speaker ?? '?'}`,
                text: u.content || u.text || '',
                startTime: u.start || 0,
                endTime: u.end || 0,
            }));
            const participants = [...new Set(segments.map(s => s.speaker))];

            await Transcript.findOneAndUpdate(
                { meetingId },
                { status: 'completed', segments, participants }
            );

            if (!doc.summary || !doc.summary.overview) {
                generateSummaryInternal(meetingId, segments);
            }

            return res.json({ meetingId, participants, segments, summary: doc.summary });
        }

        res.status(202).json({ status: data.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getSavedTranscript = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const [doc, meeting] = await Promise.all([
            Transcript.findOne({ meetingId }).lean(),
            Meeting.findOne({ roomId: meetingId }).select('chat personalNotes').lean()
        ]);
        res.json({ ...doc, chat: meeting?.chat || [], personalNotes: meeting?.personalNotes || [], found: !!(doc || meeting) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const summarize = async (req, res) => {
    try {
        const { meetingId, segments = [], participants = [] } = req.body;
        const transcriptText = segments.map(s => `[${s.speaker}]: ${s.text}`).join('\n');
        const prompt = `Act as a Senior Technical Project Manager. JSON: { "overview": "", "roles": [], "keyPoints": [], "actionItems": [], "decisions": [] }. Participants: ${participants.join(', ')}. Transcript:\n${transcriptText.slice(0, 5000)}`;

        const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }),
        });
        if (!gRes.ok) throw new Error('Groq failed');
        const gData = await gRes.json();
        const parsed = JSON.parse(gData.choices[0]?.message?.content || '{}');

        const toStringArr = (arr) => Array.isArray(arr) ? arr.map(i => typeof i === 'string' ? i : JSON.stringify(i)) : [];
        const summaryDoc = {
            overview: String(parsed.overview || ''),
            roles: Array.isArray(parsed.roles) ? parsed.roles : [],
            keyPoints: toStringArr(parsed.keyPoints),
            actionItems: toStringArr(parsed.actionItems),
            decisions: toStringArr(parsed.decisions),
            generatedAt: new Date()
        };

        await Transcript.findOneAndUpdate({ meetingId }, { $set: { summary: summaryDoc } }, { upsert: true });
        res.json({ meetingId, summary: summaryDoc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getStatus = async (req, res) => {
    try {
        const doc = await Transcript.findOne({ meetingId: req.params.meetingId });
        res.json({ running: !!(doc && doc.status === 'processing') });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const updateTranscript = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { summary } = req.body;
        const userId = req.auth.userId;

        const [transcript, meeting] = await Promise.all([
            Transcript.findOne({ meetingId }),
            Meeting.findOne({ roomId: meetingId }).select('hostId')
        ]);

        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
        if (String(meeting.hostId) !== String(userId)) return res.status(403).json({ error: 'Only the meeting host can edit the report' });

        if (!transcript) return res.status(404).json({ error: 'Transcript data not found' });

        // Update the summary field
        if (summary) {
            transcript.summary = {
                ...transcript.summary,
                ...summary,
                generatedAt: transcript.summary?.generatedAt || new Date()
            };
            await transcript.save();
        }

        res.json({ success: true, summary: transcript.summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
