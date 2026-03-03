import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema({
    meetingId: { type: String, required: true, index: true },
    hostId: { type: String },
    botId: { type: String },
    transcriptionId: { type: String },
    status: { type: String, enum: ['processing', 'completed', 'error'], default: 'processing' },
    audioUrl: { type: String },
    participants: [String],
    segments: [{ speaker: String, text: String, startTime: Number, endTime: Number }],
    rawJson: { type: mongoose.Schema.Types.Mixed },
    summary: {
        overview: String,
        keyPoints: [String],
        actionItems: [String],
        decisions: [String],
        raw: String,          // full Groq response
        generatedAt: Date,
    },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Transcript', transcriptSchema);
