import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    socketId: { type: String },
    name: { type: String },
    avatar: { type: String },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    isActive: { type: Boolean, default: true },
}, { _id: false });

const meetingSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true, index: true },
    hostId: { type: String, required: true },
    hostSocketId: { type: String },
    inviteUrl: { type: String },
    title: { type: String, default: 'Untitled Meeting' },
    participants: [participantSchema],
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
}, { timestamps: true });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
