import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { createAdapter } from '@socket.io/mongo-adapter';
import meetingRoutes from './routes/meetingRoutes.js';
import * as ctrl from './controllers/meetingController.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const COLLECTION_NAME = 'socket_io_adapter';

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'https://smartsps.vercel.app'
].filter(Boolean);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'], // Allow polling for Vercel fallback
    perMessageDeflate: false,
    connectTimeout: 45000
});

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : '*', credentials: true }));
app.use(express.json());

let cachedMongoose = null;
const connectMongoose = async () => {
    if (cachedMongoose) return cachedMongoose;
    cachedMongoose = await mongoose.connect(process.env.MONGODB_URI);
    console.log('Mongoose connected');
    return cachedMongoose;
};
connectMongoose().catch(console.error);

let cachedClient = null;
const getAdapter = async () => {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    try {
        await db.createCollection(COLLECTION_NAME, { capped: true, size: 1e6 });
    } catch (e) { }
    const collection = db.collection(COLLECTION_NAME);
    const adapter = createAdapter(collection);
    io.adapter(adapter);
    cachedClient = adapter;
    console.log('Socket.io Adapter Ready');
    return adapter;
};
getAdapter().catch(console.error);

app.use('/api/meetings', meetingRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Required handlers for Socket.io on Vercel signaling
io.on('connection', (socket) => {
    socket.on('join-room', async ({ roomId, userId, userName, userAvatar }) => {
        socket.userId = userId;
        socket.userName = userName;
        socket.userAvatar = userAvatar;
        socket.roomId = roomId;
        await socket.join(roomId);

        const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const inviteUrl = `${appUrl}?room=${roomId}`;

        const { isHost } = await ctrl.createOrJoinMeeting({
            roomId, userId, userName, userAvatar,
            socketId: socket.id, inviteUrl,
        }).catch(err => { console.error('DB join error:', err.message); return { isHost: false }; });

        const hostSocketId = await ctrl.getHostSocketId(roomId);
        if (isHost && !hostSocketId) {
            await ctrl.reassignHost({ roomId, newHostSocketId: socket.id, newHostUserId: userId });
        }

        const effectiveHost = isHost && !hostSocketId ? socket.id : hostSocketId;
        socket.emit('host-status', socket.id === effectiveHost);
        socket.emit('invite-url', inviteUrl);

        const socketsInRoom = await io.in(roomId).fetchSockets();
        const others = socketsInRoom
            .filter(s => s.id !== socket.id && s.userId !== userId)
            .map(s => ({ socketId: s.id, userId: s.userId, userName: s.userName, userAvatar: s.userAvatar }));

        socket.emit('all-users', others);
        socket.broadcast.to(roomId).emit('peer-joined-room', { socketId: socket.id, userId, userName, userAvatar });
    });

    socket.on('sending-signal', ({ userToSignal, callerId, signal, userName, userAvatar }) => {
        io.to(userToSignal).emit('user-joined', { signal, callerId, userName, userAvatar });
    });

    socket.on('returning-signal', ({ callerId, signal }) => {
        io.to(callerId).emit('receiving-returned-signal', {
            signal, id: socket.id, userName: socket.userName, userAvatar: socket.userAvatar,
        });
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
        const hostSocketId = await ctrl.getHostSocketId(roomId);
        if (hostSocketId !== socket.id) return;
        io.to(targetSocketId).emit('force-muted', { byName: socket.userName });
    });

    socket.on('state-change', ({ roomId, muted }) => {
        socket.broadcast.to(roomId).emit('peer-state-change', { socketId: socket.id, muted });
    });

    socket.on('disconnecting', async () => {
        const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
        for (const roomId of rooms) {
            socket.broadcast.to(roomId).emit('user-left', socket.id);
            await ctrl.participantLeft({ roomId, userId: socket.userId, socketId: socket.id }).catch(() => { });

            const remaining = await io.in(roomId).fetchSockets();
            const others = remaining.filter(s => s.id !== socket.id);
            if (others.length === 0) {
                await ctrl.endMeeting(roomId).catch(() => { });
                continue;
            }

            const hostSocketId = await ctrl.getHostSocketId(roomId);
            if (hostSocketId === socket.id) {
                const next = others[0];
                await ctrl.reassignHost({ roomId, newHostSocketId: next.id, newHostUserId: next.userId });
                io.to(next.id).emit('host-status', true);
                io.to(roomId).emit('host-changed', { newHostSocketId: next.id });
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(PORT, () => console.log(`SmartSPS Backend on :${PORT}`));
}

export default app;
