import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import meetingRoutes from './routes/meetingRoutes.js';
import recordingRoutes from './routes/recordingRoutes.js';
import vexaRoutes from './routes/vexaRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { getCacheStats } from './cache.js';

const app = express();

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-user-name', 'x-user-avatar']
}));

app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) return;
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            family: 4, // Force IPv4 to fix slow DNS resolution (Common Node.js/Windows issue)
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
    }
};
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/vexa', vexaRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/test-db/:roomId', async (req, res) => {
    try {
        const Meeting = (await import('./models/Meeting.js')).default;
        const m = await Meeting.findOne({ roomId: req.params.roomId }).lean();
        res.json(m || { error: 'Not Found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/cache-stats', (req, res) => res.json(getCacheStats()));
app.get('/debug', (req, res) => res.json({
    env: {
        MONGODB_URI: !!process.env.MONGODB_URI,
        VEXA_API_KEY: !!process.env.VEXA_API_KEY,
        GROQ_API_KEY: !!process.env.GROQ_API_KEY,
        FRONTEND_URL: process.env.FRONTEND_URL || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    },
    mongo: mongoose.connection.readyState,
}));

app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server on port ${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());