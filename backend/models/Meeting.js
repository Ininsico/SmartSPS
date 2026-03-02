import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    hostId: {
        type: String, // Clerk User ID
        required: true
    },
    title: {
        type: String,
        default: 'Untitled Meeting'
    },
    participants: [{
        userId: String, // Clerk User ID
        name: String,
        email: String,
        avatar: String,
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date
}, { timestamps: true });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
