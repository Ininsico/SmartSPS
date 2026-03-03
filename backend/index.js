import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import meetingRoutes from './routes/meetingRoutes.js';
import recordingRoutes from './routes/recordingRoutes.js';
import vexaRoutes from './routes/vexaRoutes.js';
import { getCacheStats } from './cache.js';

const app = express();

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Clerk-Auth-Token']
}));

app.use(express.json({ limit: '50mb' }));

let mongoPromise = null;

const connectDB = () => {
    if (mongoose.connection.readyState === 1) return Promise.resolve();
    if (mongoPromise) return mongoPromise;
    mongoPromise = mongoose.connect(process.env.MONGODB_URI)
        .then(() => { mongoPromise = null; })
        .catch(err => { mongoPromise = null; throw err; });
    return mongoPromise;
};

// Await DB before every route
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        res.status(503).json({ error: 'Database unavailable' });
    }
});

app.use('/api/meetings', meetingRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/vexa', vexaRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/cache-stats', (req, res) => res.json(getCacheStats()));
app.get('/debug', (req, res) => res.json({
    env: {
        MONGODB_URI: !!process.env.MONGODB_URI,
        CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
        FRONTEND_URL: process.env.FRONTEND_URL || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    },
    mongo: mongoose.connection.readyState,
}));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server on port ${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());