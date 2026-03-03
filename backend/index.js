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

// Use a dynamic origin helper to support credentials with any origin
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Clerk-Auth-Token']
}));

app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Clerk-Auth-Token');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB error:', err));

// Socket.io with CORS mirroring
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        credentials: true,
        methods: ['GET', 'POST']
    },
    path: '/socket.io'
});

// MongoDB adapter for Socket.io
const COLLECTION_NAME = 'socket.io-adapter';
const mongoClient = new MongoClient(process.env.MONGODB_URI);
mongoClient.connect().then(() => {
    const db = mongoClient.db();
    db.createCollection(COLLECTION_NAME, { capped: true, size: 1e6 }).catch(() => { });
    const collection = db.collection(COLLECTION_NAME);
    io.adapter(createAdapter(collection));
    console.log('✅ Socket.io adapter ready');
}).catch(err => console.log('❌ Adapter error:', err));

// Routes
app.use('/api/meetings', meetingRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Socket.io events
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

            const others = (result.meeting.participants || [])
                .filter(p => p.isActive && p.socketId !== socket.id)
                .map(p => ({ socketId: p.socketId, userId: p.userId, userName: p.name, userAvatar: p.avatar }));

            socket.emit('all-users', others);
            socket.broadcast.to(roomId).emit('peer-joined', { socketId: socket.id, userId, userName, userAvatar });

        } catch (err) {
            console.log('❌ Join error:', err);
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
        socket.broadcast.to(roomId).emit('peer-hand-raised', { socketId: socket.id, userName: socket.userName, raised });
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
            console.log('❌ Admin mute error:', err);
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
            console.log('❌ Disconnect error:', err);
        }
    });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

// Vercel Bridging for Socket.io signalling
app.all('/socket.io/(.*)', (req, res) => {
    io.engine.handleRequest(req, res);
});

export default app;
