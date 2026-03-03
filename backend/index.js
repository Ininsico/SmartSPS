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

app.use(express.json({ limit: '50kb' }));

mongoose
    .connect(process.env.MONGODB_URI, {
        maxPoolSize: 20,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 5000,
        compressors: 'zstd,zlib',
        retryWrites: true,
        w: 'majority',
    })
    .then(async () => {
        console.log('✅ MongoDB connected (pool: 5–20)');
        const db = mongoose.connection.db;
        const meetings = db.collection('meetings');
        await Promise.all([
            meetings.createIndex({ roomId: 1 }, { unique: true, background: true }),
            meetings.createIndex({ hostId: 1, createdAt: -1 }, { background: true }),
            meetings.createIndex({ 'participants.userId': 1, createdAt: -1 }, { background: true }),
            meetings.createIndex({ roomId: 1, 'participants.socketId': 1 }, { background: true }),
            meetings.createIndex(
                { endTime: 1 },
                { expireAfterSeconds: 90 * 24 * 3600, partialFilterExpression: { status: 'ended' }, background: true }
            ),
        ]);
        console.log('✅ Indexes ensured');
    })
    .catch(err => console.error('❌ MongoDB error:', err));

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        credentials: true,
        methods: ['GET', 'POST']
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    perMessageDeflate: false,
    httpCompression: false,
    pingInterval: 10000,
    pingTimeout: 5000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 2e6,
});

const COLLECTION_NAME = 'socket.io-adapter';
const mongoClient = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, minPoolSize: 2 });
mongoClient.connect().then(() => {
    const db = mongoClient.db();
    db.createCollection(COLLECTION_NAME, { capped: true, size: 1e6 }).catch(() => { });
    const collection = db.collection(COLLECTION_NAME);
    io.adapter(createAdapter(collection));
    console.log('✅ Socket.io adapter ready');
}).catch(err => console.error('❌ Adapter error:', err));

app.use('/api/meetings', meetingRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.get('/cache-stats', (req, res) => res.json(getCacheStats()));

io.on('connection', (socket) => {
    console.log('🔌 Connected:', socket.id);

    socket.on('join-room', async ({ roomId, userId, userName, userAvatar }) => {
        try {
            roomId = roomId.toLowerCase();
            socket.userId = userId;
            socket.userName = userName;
            socket.userAvatar = userAvatar;
            socket.roomId = roomId;

            // STEP 1: Join the room FIRST, then fetch live sockets.
            // Using Promise.all here races join vs fetch — socket may not be in room yet.
            await socket.join(roomId);
            const roomSockets = await io.in(roomId).fetchSockets();

            const inviteUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}?room=${roomId}` : '';

            const result = await ctrl.createOrJoinMeeting({
                roomId, userId, userName, userAvatar, socketId: socket.id, inviteUrl,
            });

            if (!result) return;

            const amHost = result.meeting.hostId === userId;

            if (amHost && result.meeting.hostSocketId !== socket.id) {
                ctrl.reassignHost({ roomId, newHostSocketId: socket.id, newHostUserId: userId });
            }

            socket.emit('host-status', amHost);
            socket.emit('invite-url', inviteUrl);

            // STEP 2: Build the list of OTHER live sockets in the room (not the new joiner).
            // Use live socket data directly rather than stale DB participant records
            // to avoid stale socketId mismatches.
            const others = roomSockets
                .filter(s => s.id !== socket.id)
                .map(s => ({
                    socketId: s.id,
                    userId: s.userId,
                    userName: s.userName,
                    userAvatar: s.userAvatar,
                }));

            // STEP 3: Send all-users to the NEW joiner FIRST so they can set up
            // receiver peers before the existing users send them offers.
            socket.emit('all-users', others);

            // STEP 4: THEN notify others that a new peer joined so they initiate offers.
            // Small delay ensures the new joiner's 'all-users' handler runs first.
            setTimeout(() => {
                socket.broadcast.to(roomId).emit('peer-joined', { socketId: socket.id, userId, userName, userAvatar });
            }, 100);

        } catch (err) {
            console.error('Join error:', err);
        }
    });

    socket.on('signal', ({ to, signal }) => io.to(to).emit('signal', { from: socket.id, signal }));
    socket.on('ice-candidate', ({ to, candidate }) => io.to(to).emit('ice-candidate', { from: socket.id, candidate }));

    socket.on('reaction', ({ roomId, emoji }) => {
        io.to(roomId).emit('reaction', { from: socket.id, userName: socket.userName, userAvatar: socket.userAvatar, emoji });
    });

    socket.on('raise-hand', ({ roomId, raised }) => socket.broadcast.to(roomId).emit('peer-state-change', { socketId: socket.id, handRaised: raised }));
    socket.on('state-change', ({ roomId, muted }) => socket.broadcast.to(roomId).emit('peer-state-change', { socketId: socket.id, muted }));

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

    socket.on('admin-mute', async ({ targetSocketId, roomId }) => {
        try {
            const hostSocketId = await ctrl.getHostSocketId(roomId);
            if (hostSocketId === socket.id) io.to(targetSocketId).emit('force-muted', { byName: socket.userName });
        } catch (err) { console.error('Admin mute error:', err); }
    });

    socket.on('admin-request-unmute', async ({ targetSocketId, roomId }) => {
        try {
            const hostSocketId = await ctrl.getHostSocketId(roomId);
            if (hostSocketId === socket.id) io.to(targetSocketId).emit('request-unmute', { byName: socket.userName });
        } catch (err) { console.error('Admin unmute error:', err); }
    });

    socket.on('disconnecting', async () => {
        try {
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            await Promise.all(rooms.map(async (roomId) => {
                socket.broadcast.to(roomId).emit('user-left', socket.id);
                ctrl.participantLeft({ roomId, userId: socket.userId, socketId: socket.id });

                const sockets = await io.in(roomId).fetchSockets();
                const others = sockets.filter(s => s.id !== socket.id);

                if (others.length === 0) {
                    ctrl.endMeeting(roomId);
                } else {
                    const hostSocketId = await ctrl.getHostSocketId(roomId);
                    if (hostSocketId === socket.id) {
                        const next = others[0];
                        ctrl.reassignHost({ roomId, newHostSocketId: next.id, newHostUserId: next.userId });
                        io.to(next.id).emit('host-status', true);
                        io.to(roomId).emit('host-changed', { newHostSocketId: next.id });
                    }
                }
            }));
        } catch (err) { console.error('Disconnect error:', err); }
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));