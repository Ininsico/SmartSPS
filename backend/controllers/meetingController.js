import Meeting from '../models/Meeting.js';

export const getMeetingHistory = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const meetings = await Meeting.find({
            $or: [{ hostId: userId }, { 'participants.userId': userId }]
        }).sort({ createdAt: -1 }).lean();
        res.json(meetings);
    } catch {
        res.status(500).json({ error: 'Failed to fetch meeting history' });
    }
};

export const createOrJoinMeeting = async ({ roomId, userId, userName, userAvatar, socketId, isHost, inviteUrl }) => {
    let meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
        meeting = await Meeting.create({
            roomId,
            hostId: userId,
            hostSocketId: socketId,
            inviteUrl,
            title: `Meeting ${roomId.toUpperCase()}`,
            participants: [{ userId, socketId, name: userName, avatar: userAvatar, isActive: true }],
        });
        return { meeting, isHost: true };
    }

    const existing = meeting.participants.find(p => p.userId === userId);
    if (existing) {
        existing.socketId = socketId;
        existing.isActive = true;
        existing.leftAt = undefined;
    } else {
        meeting.participants.push({ userId, socketId, name: userName, avatar: userAvatar, isActive: true });
    }

    if (isHost && !meeting.hostSocketId) {
        meeting.hostSocketId = socketId;
    }

    await meeting.save();
    return { meeting, isHost: meeting.hostId === userId };
};

export const participantLeft = async ({ roomId, userId, socketId }) => {
    await Meeting.updateOne(
        { roomId, 'participants.socketId': socketId },
        { $set: { 'participants.$.isActive': false, 'participants.$.leftAt': new Date() } }
    );
};

export const reassignHost = async ({ roomId, newHostSocketId, newHostUserId }) => {
    await Meeting.updateOne({ roomId }, { $set: { hostId: newHostUserId, hostSocketId: newHostSocketId } });
};

export const endMeeting = async (roomId) => {
    await Meeting.findOneAndUpdate(
        { roomId },
        { $set: { status: 'ended', endTime: new Date() } }
    );
};

export const getHostSocketId = async (roomId) => {
    const m = await Meeting.findOne({ roomId }, 'hostSocketId').lean();
    return m?.hostSocketId ?? null;
};
export { Meeting };
