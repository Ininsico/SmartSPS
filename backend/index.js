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

const app = express();
const httpServer = createServer(app);

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Clerk-Auth-Token']
}));

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB error:', err));

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        credentials: true,
        methods: ['GET', 'POST']
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],   // WebSocket first — matches client
    // Compression adds CPU latency on tiny real-time packets; disable it
    perMessageDeflate: false,
    httpCompression: false,
    // Fast heartbeat: detect dead connections in 10 s, not the default 25 s
    pingInterval: 10000,
    pingTimeout: 5000,
    // Upgrade timeout: how long to wait for WS upgrade before falling back
    upgradeTimeout: 10000,
});

const COLLECTION_NAME = 'socket.io-adapter';
const mongoClient = new MongoClient(process.env.MONGODB_URI);
mongoClient.connect().then(() => {
    const db = mongoClient.db();
    db.createCollection(COLLECTION_NAME, { capped: true, size: 1e6 }).catch(() => { });
    const collection = db.collection(COLLECTION_NAME);
    io.adapter(createAdapter(collection));
    console.log(' Socket.io adapter ready');
}).catch(err => console.log(' Adapter error:', err));

app.use('/api/meetings', meetingRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    socket.on('join-room', async ({ roomId, userId, userName, userAvatar }) => {
        try {
            roomId = roomId.toLowerCase();
            socket.userId = userId;
            socket.userName = userName;
            socket.userAvatar = userAvatar;
            socket.roomId = roomId;

            await socket.join(roomId);

            const inviteUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}?room=${roomId}` : '';

            const result = await ctrl.createOrJoinMeeting({
                roomId, userId, userName, userAvatar,
                socketId: socket.id, inviteUrl,
            });

            if (!result) return;

            const amHost = result.meeting.hostId === userId;

            if (amHost && !result.meeting.hostSocketId) {
                await ctrl.reassignHost({ roomId, newHostSocketId: socket.id, newHostUserId: userId });
            }

            socket.emit('host-status', amHost);
            socket.emit('invite-url', inviteUrl);

            // Only include participants that have active socket connections RIGHT NOW
            // to avoid sending stale socketIds from a previous session
            const roomSockets = await io.in(roomId).fetchSockets();
            const liveSocketIds = new Set(roomSockets.map(s => s.id));
            liveSocketIds.delete(socket.id); // exclude self

            const others = (result.meeting.participants || [])
                .filter(p => p.isActive && p.socketId !== socket.id && liveSocketIds.has(p.socketId))
                .map(p => ({ socketId: p.socketId, userId: p.userId, userName: p.name, userAvatar: p.avatar }));

            socket.emit('all-users', others);
            socket.broadcast.to(roomId).emit('peer-joined', { socketId: socket.id, userId, userName, userAvatar });

        } catch (err) {
            console.log('Join error:', err);
        }
    });

    socket.on('signal', ({ to, signal }) => {
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('reaction', ({ roomId, emoji }) => {
        io.to(roomId).emit('reaction', { from: socket.id, userName: socket.userName, userAvatar: socket.userAvatar, emoji });
    });

    socket.on('raise-hand', ({ roomId, raised }) => {
        // Emit as peer-state-change so the frontend's single handler processes everything
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

    socket.on('admin-mute', async ({ targetSocketId, roomId }) => {
        try {
            const hostSocketId = await ctrl.getHostSocketId(roomId);
            if (hostSocketId === socket.id) {
                io.to(targetSocketId).emit('force-muted', { byName: socket.userName });
            }
        } catch (err) {
            console.log(' Admin mute error:', err);
        }
    });

    socket.on('state-change', ({ roomId, muted }) => {
        socket.broadcast.to(roomId).emit('peer-state-change', { socketId: socket.id, muted });
    });

    socket.on('disconnecting', async () => {
        try {
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            for (const roomId of rooms) {
                socket.broadcast.to(roomId).emit('user-left', socket.id);
                await ctrl.participantLeft({ roomId, userId: socket.userId, socketId: socket.id });

                const sockets = await io.in(roomId).fetchSockets();
                const others = sockets.filter(s => s.id !== socket.id);

                if (others.length === 0) {
                    await ctrl.endMeeting(roomId);
                } else {
                    const hostSocketId = await ctrl.getHostSocketId(roomId);
                    if (hostSocketId === socket.id) {
                        await ctrl.reassignHost({
                            roomId,
                            newHostSocketId: others[0].id,
                            newHostUserId: others[0].userId
                        });
                        io.to(others[0].id).emit('host-status', true);
                        io.to(roomId).emit('host-changed', { newHostSocketId: others[0].id });
                    }
                }
            }
        } catch (err) {
            console.log(' Disconnect error:', err);
        }
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(` Server running on port ${PORT}`));