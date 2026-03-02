import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import meetingRoutes from './routes/meetingRoutes.js';
import * as meetingController from './controllers/meetingController.js';

dotenv.config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB error:', err));

app.use('/api/meetings', meetingRoutes);

io.on('connection', (socket) => {
    console.log(`[+] ${socket.id}`);

    socket.on('join-room', async ({ roomId, userId, userName, userAvatar, isHost }) => {
        socket.userId = userId;
        socket.userName = userName;
        socket.userAvatar = userAvatar;
        socket.roomId = roomId;
        socket.join(roomId);

        try {
            await meetingController.createOrJoinMeeting({ roomId, userId, userName, userAvatar, isHost });
        } catch (err) {
            console.error('DB error:', err);
        }

        const all = await io.in(roomId).fetchSockets();
        const others = all
            .filter(s => s.id !== socket.id && s.userId !== userId)
            .map(s => ({ socketId: s.id, userId: s.userId, userName: s.userName, userAvatar: s.userAvatar }));

        socket.emit('all-users', others);
        socket.broadcast.to(roomId).emit('peer-joined-room', { socketId: socket.id, userId, userName, userAvatar });
    });

    socket.on('sending-signal', ({ userToSignal, callerId, signal, userName, userAvatar }) => {
        io.to(userToSignal).emit('user-joined', { signal, callerId, userName, userAvatar });
    });

    socket.on('returning-signal', ({ callerId, signal }) => {
        io.to(callerId).emit('receiving-returned-signal', { signal, id: socket.id, userName: socket.userName, userAvatar: socket.userAvatar });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
        io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('disconnecting', async () => {
        const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
        for (const roomId of rooms) {
            socket.broadcast.to(roomId).emit('user-left', socket.id);
            const remaining = await io.in(roomId).fetchSockets();
            if (remaining.length <= 1) {
                await meetingController.endMeeting(roomId).catch(console.error);
            }
        }
        console.log(`[-] ${socket.id} (${socket.userName || 'unknown'})`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on :${PORT}`));
