import Meeting from '../models/Meeting.js';
import {
    getCachedRoom, setCachedRoom, patchCachedRoom, patchCachedParticipant,
    evictRoom, getCachedHistory, setCachedHistory, invalidateHistory, invalidateAllHistory,
    recordHit, recordMiss,
} from '../cache.js';

export const getMeetingHistory = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const cached = getCachedHistory(userId);
        if (cached) { recordHit(); return res.json(cached); }

        recordMiss();
        const meetings = await Meeting.find({
            $or: [{ hostId: userId }, { 'participants.userId': userId }]
        })
            .sort({ createdAt: -1 })
            .select('roomId hostId title status scheduleTime startTime endTime participants createdAt')
            .lean();

        // Check which meetings have transcripts
        const roomIds = meetings.map(m => m.roomId);
        const transcripts = await mongoose.model('Transcript').find({ meetingId: { $in: roomIds } }).select('meetingId').lean();
        const transcriptMap = new Set(transcripts.map(t => t.meetingId));

        const meetingsWithNotes = meetings.map(m => ({
            ...m,
            hasNotes: transcriptMap.has(m.roomId)
        }));

        setCachedHistory(userId, meetingsWithNotes);
        res.json(meetingsWithNotes);
    } catch {
        res.status(500).json({ error: 'Failed to fetch meeting history' });
    }
};

export const scheduleMeeting = async (req, res) => {
    try {
        const { title, scheduleTime, roomId } = req.body;
        const hostId = req.auth.userId;

        const meeting = await Meeting.create({
            roomId,
            hostId,
            title,
            scheduleTime: new Date(scheduleTime),
            status: 'scheduled',
            participants: [],
        });

        setCachedRoom(meeting);
        invalidateHistory(hostId);

        res.status(201).json(meeting);
    } catch (err) {
        console.error('Failed to schedule meeting:', err.message);
        res.status(500).json({ error: 'Failed to schedule meeting', detail: err.message });
    }
};

export const createOrJoinMeeting = async ({ roomId, userId, userName, userAvatar, socketId, inviteUrl }) => {
    const cached = getCachedRoom(roomId);
    if (cached) {
        recordHit();
        const isHost = cached.hostId === userId;
        const needsActivate = cached.status === 'ended' || cached.status === 'scheduled';
        const hasActiveHost = [...cached.participants.values()].some(p => p.isActive && cached.hostId === userId);

        let newHostId = cached.hostId;
        let newHostSocketId = cached.hostSocketId;

        if (needsActivate && !hasActiveHost) { newHostId = userId; newHostSocketId = socketId; }
        if (isHost) newHostSocketId = socketId;

        patchCachedParticipant(roomId, userId, { socketId, name: userName, avatar: userAvatar, isActive: true });
        patchCachedRoom(roomId, {
            status: needsActivate ? 'active' : cached.status,
            hostId: newHostId,
            hostSocketId: newHostSocketId,
        });

        Meeting.findOneAndUpdate(
            { roomId },
            { $set: { status: needsActivate ? 'active' : cached.status, hostId: newHostId, hostSocketId: newHostSocketId, endTime: needsActivate ? null : undefined } },
            { new: false }
        ).then(doc => {
            if (!doc) return;
            const existingIdx = doc.participants.findIndex(p => p.userId === userId);
            if (existingIdx >= 0) {
                Meeting.updateOne(
                    { roomId, 'participants.userId': userId },
                    { $set: { 'participants.$.socketId': socketId, 'participants.$.isActive': true, 'participants.$.leftAt': null } }
                ).catch(() => { });
            } else {
                Meeting.updateOne(
                    { roomId },
                    { $push: { participants: { userId, socketId, name: userName, avatar: userAvatar, isActive: true } } }
                ).catch(() => { });
            }
        }).catch(() => { });

        const mockMeeting = {
            hostId: newHostId,
            hostSocketId: newHostSocketId,
            status: needsActivate ? 'active' : cached.status,
            participants: [...cached.participants.entries()].map(([uid, p]) => ({
                userId: uid, socketId: p.socketId, name: p.name, avatar: p.avatar, isActive: p.isActive,
            })),
        };
        return { meeting: mockMeeting, isHost: newHostId === userId };
    }

    recordMiss();
    let meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
        meeting = await Meeting.create({
            roomId,
            hostId: userId,
            hostSocketId: socketId,
            inviteUrl,
            title: `Meeting ${roomId.toUpperCase()}`,
            status: 'active',
            participants: [{ userId, socketId, name: userName, avatar: userAvatar, isActive: true }],
        });
        setCachedRoom(meeting);
        invalidateAllHistory();
        return { meeting, isHost: true };
    }

    const needsActivate = meeting.status === 'ended' || meeting.status === 'scheduled';
    if (needsActivate) {
        meeting.status = 'active';
        meeting.endTime = undefined;
        const hasActiveHost = meeting.participants.some(p => p.userId === meeting.hostId && p.isActive);
        if (!hasActiveHost) { meeting.hostId = userId; meeting.hostSocketId = socketId; }
    }

    const existing = meeting.participants.find(p => p.userId === userId);
    if (existing) {
        existing.socketId = socketId;
        existing.isActive = true;
        existing.leftAt = undefined;
    } else {
        meeting.participants.push({ userId, socketId, name: userName, avatar: userAvatar, isActive: true });
    }

    if (meeting.hostId === userId) meeting.hostSocketId = socketId;

    await meeting.save();
    setCachedRoom(meeting);
    return { meeting, isHost: meeting.hostId === userId };
};

export const participantLeft = async ({ roomId, userId, socketId }) => {
    patchCachedParticipant(roomId, userId, { isActive: false, socketId: null });
    Meeting.updateOne(
        { roomId, 'participants.socketId': socketId },
        { $set: { 'participants.$.isActive': false, 'participants.$.leftAt': new Date() } }
    ).catch(() => { });
};

export const reassignHost = async ({ roomId, newHostSocketId, newHostUserId }) => {
    patchCachedRoom(roomId, { hostId: newHostUserId, hostSocketId: newHostSocketId });
    Meeting.updateOne(
        { roomId },
        { $set: { hostId: newHostUserId, hostSocketId: newHostSocketId } }
    ).catch(() => { });
};

export const endMeeting = async (roomId) => {
    evictRoom(roomId);
    invalidateAllHistory();
    Meeting.findOneAndUpdate(
        { roomId },
        { $set: { status: 'ended', endTime: new Date() } }
    ).catch(() => { });
};

export const getHostSocketId = async (roomId) => {
    const cached = getCachedRoom(roomId);
    if (cached) { recordHit(); return cached.hostSocketId ?? null; }

    recordMiss();
    const m = await Meeting.findOne({ roomId }, 'hostSocketId hostId participants').lean();
    if (m) setCachedRoom(m);
    return m?.hostSocketId ?? null;
};

export { Meeting };
