import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { createAdapter } from '@socket.io/mongo-adapter';
import meetingRoutes from './routes/meetingRoutes.js';
import * as ctrl from './controllers/meetingController.js';
import { getCacheStats } from './cache.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Clerk-Auth-Token']
}));

app.use(express.json({ limit: '50kb' }));  // reject oversized payloads early

// ─────────────────────────────────────────────────────────────────────────────
//  MongoDB  — tuned connection pool
//
//  maxPoolSize 20   : allow 20 concurrent queries (default is 5)
//  minPoolSize 5    : keep 5 connections warm — no cold-start reconnect delay
//  socketTimeoutMS  : drop idle sockets before OS times them out
//  serverSelectionTimeoutMS : fail fast if Mongo is unreachable (don't hang)
//  heartbeatFrequencyMS     : check server health every 5 s (default 10 s)
//  compressors: 'zstd,zlib' : compress wire bytes between app ↔ Atlas
// ─────────────────────────────────────────────────────────────────────────────
mongoose
    .connect(process.env.MONGODB_URI, {
        maxPoolSize: 20,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 5000,
        compressors: 'zstd,zlib',
        retryWrites: true,
        w: 'majority',   // acknowledged writes
    })
    .then(async () => {
        console.log('✅ MongoDB connected (pool: 5–20)');

        // ── Ensure indexes exist on hot query paths ──────────────────────────
        //  These are idempotent (safe to run on every boot).
        const db = mongoose.connection.db;
        const meetings = db.collection('meetings');

        await Promise.all([
            // Primary lookup: join-room, getHostSocketId
            meetings.createIndex({ roomId: 1 }, { unique: true, background: true }),
            // History queries per user
            meetings.createIndex({ hostId: 1, createdAt: -1 }, { background: true }),
            meetings.createIndex({ 'participants.userId': 1, createdAt: -1 }, { background: true }),
            // Participant-level socketId lookups (participantLeft)
            meetings.createIndex({ roomId: 1, 'participants.socketId': 1 }, { background: true }),
            // TTL index — auto-delete ended meetings after 90 days (optional housekeeping)
            meetings.createIndex(
                { endTime: 1 },
                { expireAfterSeconds: 90 * 24 * 3600, partialFilterExpression: { status: 'ended' }, background: true }
            ),
        ]);
        console.log('✅ MongoDB indexes ensured');
    })
    .catch(err => console.error('❌ MongoDB error:', err));

// ─────────────────────────────────────────────────────────────────────────────
//  Socket.io server
// ─────────────────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        credentials: true,
        methods: ['GET', 'POST']
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],   // WebSocket first — matches client
    perMessageDeflate: false,               // disable per-message DEFLATE (CPU overhead on tiny packets)
    httpCompression: false,
    pingInterval: 10000,
    pingTimeout: 5000,
    upgradeTimeout: 10000,
    // Increase max HTTP buffer (default 1 MB) — prevents drops on large SDP offers
    maxHttpBufferSize: 2e6,
});

// ─── MongoDB adapter for Socket.io (multi-instance fan-out) ──────────────────
const COLLECTION_NAME = 'socket.io-adapter';
const mongoClient = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 5,   // adapter only needs a small pool
    minPoolSize: 2,
});
mongoClient.connect().then(() => {
    const db = mongoClient.db();
    db.createCollection(COLLECTION_NAME, { capped: true, size: 1e6 }).catch(() => { });
    const collection = db.collection(COLLECTION_NAME);
    io.adapter(createAdapter(collection));
    console.log('✅ Socket.io adapter ready');
}).catch(err => console.error('❌ Adapter error:', err));

// ─────────────────────────────────────────────────────────────────────────────
//  REST routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/meetings', meetingRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/cache-stats', (req, res) => res.json(getCacheStats()));  // debug endpoint

// ─────────────────────────────────────────────────────────────────────────────
//  Socket.io event handlers
// ─────────────────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    socket.on('join-room', async ({ roomId, userId, userName, userAvatar }) => {
        try {
            roomId = roomId.toLowerCase();
            socket.userId = userId;
            socket.userName = userName;
            socket.userAvatar = userAvatar;
            socket.roomId = roomId;

            // Join the socket room and fetch existing members IN PARALLEL
            const [, roomSockets] = await Promise.all([
                socket.join(roomId),
                io.in(roomId).fetchSockets(),
            ]);

            const inviteUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}?room=${roomId}` : '';

            // createOrJoinMeeting is synchronous on cache-hit (no DB wait)
            const result = await ctrl.createOrJoinMeeting({
                roomId, userId, userName, userAvatar,
                socketId: socket.id, inviteUrl,
            });

            if (!result) return;

            const amHost = result.meeting.hostId === userId;

            // Only reassign host in DB if socketId is stale (lazy update needed)
            if (amHost && result.meeting.hostSocketId !== socket.id) {
                ctrl.reassignHost({ roomId, newHostSocketId: socket.id, newHostUserId: userId });
            }

            socket.emit('host-status', amHost);
            socket.emit('invite-url', inviteUrl);

            // Use the already-fetched sockets list (no second fetchSockets call)
            const liveSocketIds = new Set(roomSockets.map(s => s.id));
            liveSocketIds.delete(socket.id);  // exclude self

            const others = (result.meeting.participants || [])
                .filter(p => p.isActive && p.socketId !== socket.id && liveSocketIds.has(p.socketId))
                .map(p => ({ socketId: p.socketId, userId: p.userId, userName: p.name, userAvatar: p.avatar }));

            socket.emit('all-users', others);
            socket.broadcast.to(roomId).emit('peer-joined', { socketId: socket.id, userId, userName, userAvatar });

        } catch (err) {
            console.error('Join error:', err);
        }
    });

    // ── WebRTC signaling — pure relay, zero DB, ultra-low latency ────────────
    socket.on('signal', ({ to, signal }) => {
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    // ── Lightweight room events — no DB ──────────────────────────────────────
    socket.on('reaction', ({ roomId, emoji }) => {
        io.to(roomId).emit('reaction', { from: socket.id, userName: socket.userName, userAvatar: socket.userAvatar, emoji });
    });

    socket.on('raise-hand', ({ roomId, raised }) => {
        socket.broadcast.to(roomId).emit('peer-state-change', { socketId: socket.id, handRaised: raised });
    });

    socket.on('chat-message', ({ roomId, text }) => {
        io.to(roomId).emit('chat-message', {
            id: `${socket.id}-${Date.now()}`,
            from: socket.id,
            userName: socket.userName,
            userAvatar: socket.userAvatar,
            text,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on('state-change', ({ roomId, muted }) => {
        socket.broadcast.to(roomId).emit('peer-state-change', { socketId: socket.id, muted });
    });

    // ── Admin mute — served from cache (getHostSocketId is O(1) on hot path) ─
    socket.on('admin-mute', async ({ targetSocketId, roomId }) => {
        try {
            const hostSocketId = await ctrl.getHostSocketId(roomId);
            if (hostSocketId === socket.id) {
                io.to(targetSocketId).emit('force-muted', { byName: socket.userName });
            }
        } catch (err) {
            console.error('Admin mute error:', err);
        }
    });

    socket.on('admin-request-unmute', async ({ targetSocketId, roomId }) => {
        try {
            const hostSocketId = await ctrl.getHostSocketId(roomId);
            if (hostSocketId === socket.id) {
                io.to(targetSocketId).emit('request-unmute', { byName: socket.userName });
            }
        } catch (err) {
            console.error('Admin unmute error:', err);
        }
    });

    // ── Disconnect — parallel writes, no sequential awaits ───────────────────
    socket.on('disconnecting', async () => {
        try {
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);

            await Promise.all(rooms.map(async (roomId) => {
                socket.broadcast.to(roomId).emit('user-left', socket.id);

                // Fire participant-left write in background (non-blocking)
                ctrl.participantLeft({ roomId, userId: socket.userId, socketId: socket.id });

                const sockets = await io.in(roomId).fetchSockets();
                const others = sockets.filter(s => s.id !== socket.id);

                if (others.length === 0) {
                    ctrl.endMeeting(roomId);   // fire-and-forget
                } else {
                    const hostSocketId = await ctrl.getHostSocketId(roomId);  // O(1) cache hit
                    if (hostSocketId === socket.id) {
                        const next = others[0];
                        ctrl.reassignHost({ roomId, newHostSocketId: next.id, newHostUserId: next.userId });
                        io.to(next.id).emit('host-status', true);
                        io.to(roomId).emit('host-changed', { newHostSocketId: next.id });
                    }
                }
            }));
        } catch (err) {
            console.error('Disconnect error:', err);
        }
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));