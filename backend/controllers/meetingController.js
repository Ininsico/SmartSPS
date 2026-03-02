import Meeting from '../models/Meeting.js';

export const getMeetingHistory = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const meetings = await Meeting.find({
            $or: [
                { hostId: userId },
                { 'participants.userId': userId }
            ]
        }).sort({ createdAt: -1 });

        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch meeting history' });
    }
};

export const createOrJoinMeeting = async ({ roomId, userId, userName, userAvatar, isHost }) => {
    try {
        let meeting = await Meeting.findOne({ roomId });

        if (!meeting && isHost) {
            meeting = new Meeting({
                roomId,
                hostId: userId,
                title: `Meeting ${roomId.substring(0, 5)}`,
                participants: [{ userId, name: userName, avatar: userAvatar }]
            });
            await meeting.save();
            return meeting;
        } else if (meeting) {
            const isAlreadyPresent = meeting.participants.some(p => p.userId === userId);
            if (!isAlreadyPresent) {
                meeting.participants.push({ userId, name: userName, avatar: userAvatar });
                await meeting.save();
            }
            return meeting;
        }
        return null;
    } catch (err) {
        console.error('Error in createOrJoinMeeting:', err);
        throw err;
    }
};

export const endMeeting = async (roomId) => {
    try {
        await Meeting.findOneAndUpdate({ roomId }, { status: 'ended', endTime: new Date() });
    } catch (err) {
        console.error('Error ending meeting:', err);
    }
};
