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
    status: { type: String, enum: ['scheduled', 'active', 'ended'], default: 'active' },
    startTime: { type: Date, default: Date.now },
    scheduleTime: { type: Date },
    endTime: { type: Date },
    chat: [{
        senderId: { type: String, required: true },
        senderName: { type: String },
        senderAvatar: { type: String },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

meetingSchema.index({ hostId: 1 });
meetingSchema.index({ 'participants.userId': 1 });
meetingSchema.index({ status: 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
