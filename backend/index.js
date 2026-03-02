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

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB: smartmeet'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// API Routes
app.use('/api/meetings', meetingRoutes);

// Socket.io logic
io.on('connection', (socket) => {
    console.log('User connected: ', socket.id);

    socket.on('join-room', async ({ roomId, userId, userName, userAvatar, isHost }) => {
        socket.join(roomId);

        // PERSISTENT DB HANDLER (NO ARRAYS)
        try {
            await meetingController.createOrJoinMeeting({ roomId, userId, userName, userAvatar, isHost });
        } catch (err) {
            console.error('Persistence error:', err);
        }

        // DISCOVERY (Uses socket's own in-memory room mechanism only for signaling, never for data storage)
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const otherUsers = socketsInRoom
            .map(s => s.id)
            .filter(id => id !== socket.id);

        socket.emit('all-users', otherUsers);
    });

    socket.on('sending-signal', (payload) => {
        io.to(payload.userToSignal).emit('user-joined', {
            signal: payload.signal,
            callerId: payload.callerId
        });
    });

    socket.on('returning-signal', (payload) => {
        io.to(payload.callerId).emit('receiving-returned-signal', {
            signal: payload.signal,
            id: socket.id
        });
    });

    socket.on('disconnecting', async () => {
        // Logic for ending meeting / cleanup in DB if necessary
        const roomsList = Array.from(socket.rooms);
        for (const roomId of roomsList) {
            if (roomId !== socket.id) {
                const socketsInRoom = await io.in(roomId).fetchSockets();
                if (socketsInRoom.length <= 1) {
                    // Only one user (the current one about to leave) or empty
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
