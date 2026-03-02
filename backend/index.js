import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // For development, allow all. In production, specify frontend URL.
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
    res.send('NexusMeet Signaling Server is running.');
});

// Participant logic
const users = {}; // Stores {socketId: {roomId, userId}}
const socketToRoom = {}; // Mapping of socketId to roomId

io.on('connection', (socket) => {
    console.log('User connected: ', socket.id);

    // Join Room
    socket.on('join-room', ({ roomId, userId }) => {
        if (users[roomId]) {
            const length = users[roomId].length;
            if (length === 4) {
                socket.emit('room-full');
                return;
            }
            users[roomId].push(socket.id);
        } else {
            users[roomId] = [socket.id];
        }

        socketToRoom[socket.id] = roomId;
        const usersInThisRoom = users[roomId].filter(id => id !== socket.id);

        // Send the list of existing users to the new user
        socket.emit('all-users', usersInThisRoom);
    });

    // Sending WebRTC Signal (Offer)
    socket.on('sending-signal', (payload) => {
        io.to(payload.userToSignal).emit('user-joined', {
            signal: payload.signal,
            callerId: payload.callerId
        });
    });

    // Returning WebRTC Signal (Answer)
    socket.on('returning-signal', (payload) => {
        io.to(payload.callerId).emit('receiving-returned-signal', {
            signal: payload.signal,
            id: socket.id
        });
    });

    // Handle Disconnection
    socket.on('disconnect', () => {
        const roomId = socketToRoom[socket.id];
        let room = users[roomId];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomId] = room;
        }

        // Notify others in the room that this user has left
        socket.broadcast.emit('user-left', socket.id);
        console.log('User disconnected: ', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
