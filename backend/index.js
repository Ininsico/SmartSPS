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
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB: smartmeet'))
    .catch(err => console.error('MongoDB Connection Error:', err));

app.use('/api/meetings', meetingRoutes);

io.on('connection', (socket) => {
    console.log('User connected: ', socket.id);

    socket.on('join-room', async ({ roomId, userId, userName, userAvatar, isHost }) => {
        socket.userId = userId;
        socket.userName = userName;
        socket.userAvatar = userAvatar;
        socket.join(roomId);
        try {
            await meetingController.createOrJoinMeeting({ roomId, userId, userName, userAvatar, isHost });
        } catch (err) {
            console.error('Persistence error:', err);
        }
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const otherUsers = socketsInRoom
            .filter(s => s.id !== socket.id && s.userId !== userId)
            .map(s => s.id);

        socket.emit('all-users', otherUsers);
    });

    socket.on('sending-signal', (payload) => {
        io.to(payload.userToSignal).emit('user-joined', {
            signal: payload.signal,
            callerId: payload.callerId,
            userName: payload.userName,
            userAvatar: payload.userAvatar
        });
    });

    socket.on('returning-signal', (payload) => {
        io.to(payload.callerId).emit('receiving-returned-signal', {
            signal: payload.signal,
            id: socket.id,
            userName: socket.userName,
            userAvatar: socket.userAvatar
        });
    });

    socket.on('disconnecting', async () => {
        const roomsList = Array.from(socket.rooms);
        for (const roomId of roomsList) {
            if (roomId !== socket.id) {
                const socketsInRoom = await io.in(roomId).fetchSockets();
                if (socketsInRoom.length <= 1) {
                    await meetingController.endMeeting(roomId);
                }
                socket.broadcast.to(roomId).emit('user-left', socket.id);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
