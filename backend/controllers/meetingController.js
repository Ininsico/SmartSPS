import Meeting from '../models/Meeting.js';
import Transcript from '../models/Transcript.js';
import mongoose from 'mongoose';
import {
    getCachedRoom, setCachedRoom, patchCachedRoom, patchCachedParticipant,
    evictRoom, getCachedHistory, setCachedHistory, invalidateHistory, invalidateAllHistory,
    recordHit, recordMiss,
} from '../cache.js';

import pusher from '../pusher.js';

export const getMeetingHistory = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const cached = getCachedHistory(userId);
        if (cached) { recordHit(); return res.json(cached); }

        recordMiss();
        const meetings = await Meeting.find({
            $or: [
                { hostId: userId },
                { 'participants.userId': userId }
            ]
        })
            .sort({ createdAt: -1 })
            .select('roomId hostId title status scheduleTime startTime endTime participants createdAt')
            .lean();

        console.log(`[HISTORY] Fetched ${meetings.length} meetings for ${userId}`);
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

export const joinMeeting = async (req, res) => {
    try {
        const { roomId: rawRoomId, userName: bodyName, userAvatar: bodyAvatar, agoraUid } = req.body;
        const roomId = rawRoomId?.trim();
        const userId = req.auth.userId;
        const userName = bodyName || req.headers['x-user-name'] || 'User';
        const userAvatar = bodyAvatar || req.headers['x-user-avatar'] || '';
        const socketId = req.headers['x-session-id'] || 'no-session';
        const inviteUrl = `${req.headers.origin}/?room=${roomId}`;

        const result = await createOrJoinMeeting({ roomId, userId, userName, userAvatar, agoraUid, socketId, inviteUrl });
        console.log(`[JOIN] User ${userId} joined room ${roomId}`);
        res.json(result);
    } catch (err) {
        console.error('Join meeting failed:', err.message);
        res.status(400).json({ error: err.message });
    }
};

export const createOrJoinMeeting = async ({ roomId, userId, userName, userAvatar, agoraUid, socketId, inviteUrl }) => {
    const cached = getCachedRoom(roomId);
    let meeting;

    if (cached) {
        recordHit();
        // If meeting is already ended, block joining
        if (cached.status === 'ended') {
            throw new Error('Meeting has already ended');
        }

        const needsActivate = cached.status === 'scheduled';
        const isHost = cached.hostId === userId;

        // Check if the original host is currenty active in the room
        const hasActiveHost = [...cached.participants.values()].some(p => p.isActive && p.userId === cached.hostId);

        let newHostId = cached.hostId;
        let newHostSocketId = cached.hostSocketId;

        // Reassign host if room is being restarted or if the host rejoined
        if (needsActivate && !hasActiveHost) {
            newHostId = userId;
            newHostSocketId = socketId;
        } else if (isHost) {
            newHostSocketId = socketId;
        }

        // Update DB atomically
        meeting = await Meeting.findOneAndUpdate(
            { roomId },
            {
                $set: {
                    status: needsActivate ? 'active' : cached.status,
                    hostId: newHostId,
                    hostSocketId: newHostSocketId,
                    startTime: (needsActivate || !cached.startTime) ? new Date() : cached.startTime,
                    endTime: null
                }
            },
            { new: true }
        );

        if (meeting) {
            const existingIdx = meeting.participants.findIndex(p => p.userId === userId);
            if (existingIdx >= 0) {
                await Meeting.updateOne(
                    { roomId, 'participants.userId': userId },
                    { $set: { 'participants.$.socketId': socketId, 'participants.$.isActive': true, 'participants.$.leftAt': null, 'participants.$.name': userName, 'participants.$.avatar': userAvatar, 'participants.$.agoraUid': agoraUid } }
                );
            } else {
                await Meeting.updateOne(
                    { roomId },
                    { $push: { participants: { userId, socketId, name: userName, avatar: userAvatar, isActive: true, agoraUid } } }
                );
            }

            // Sync cache
            patchCachedParticipant(roomId, userId, { socketId, name: userName, avatar: userAvatar, isActive: true, agoraUid });
            patchCachedRoom(roomId, {
                status: meeting.status,
                hostId: newHostId,
                hostSocketId: newHostSocketId,
                startTime: meeting.startTime,
                endTime: meeting.endTime
            });

            // Broadcast join event
            pusher.trigger(`room-${roomId}`, 'user-joined', {
                userId,
                userName,
                userAvatar,
                agoraUid
            }).catch(() => { });
        }
    } else {
        recordMiss();
        meeting = await Meeting.findOne({ roomId });

        if (!meeting) {
            meeting = await Meeting.create({
                roomId,
                hostId: userId,
                hostSocketId: socketId,
                inviteUrl,
                title: `Meeting ${roomId.toUpperCase()}`,
                status: 'active',
                participants: [{ userId, socketId, name: userName, avatar: userAvatar, isActive: true, agoraUid }],
                startTime: new Date()
            });
        } else {
            // Block joining if meeting is ended
            if (meeting.status === 'ended') {
                throw new Error('Meeting has already ended');
            }

            const needsActivate = meeting.status === 'scheduled';
            if (needsActivate) {
                meeting.status = 'active';
                meeting.endTime = null;
                meeting.startTime = new Date();
                const hasActiveHost = meeting.participants.some(p => p.userId === meeting.hostId && p.isActive);
                if (!hasActiveHost) { meeting.hostId = userId; meeting.hostSocketId = socketId; }
            }

            const existing = meeting.participants.find(p => p.userId === userId);
            if (existing) {
                existing.socketId = socketId;
                existing.isActive = true;
                existing.leftAt = null;
                existing.name = userName;
                existing.avatar = userAvatar;
                existing.agoraUid = agoraUid;
            } else {
                meeting.participants.push({ userId, socketId, name: userName, avatar: userAvatar, isActive: true, agoraUid });
            }

            if (meeting.hostId === userId) meeting.hostSocketId = socketId;
            await meeting.save();
        }
        setCachedRoom(meeting);
    }

    invalidateAllHistory();
    return { meeting, isHost: meeting.hostId === userId };
};

export const participantLeft = async ({ roomId, userId, socketId }) => {
    patchCachedParticipant(roomId, userId, { isActive: false, socketId: null });
    const query = socketId ? { roomId, 'participants.socketId': socketId } : { roomId, 'participants.userId': userId };

    // Mark participant as inactive in DB
    const updated = await Meeting.findOneAndUpdate(
        query,
        { $set: { 'participants.$.isActive': false, 'participants.$.leftAt': new Date() } },
        { new: true }
    ).catch(() => { });

    if (updated) {
        const p = updated.participants.find(x => String(x.userId) === String(userId));
        if (p) {
            pusher.trigger(`room-${roomId}`, 'user-left', {
                userId,
                userName: p.name
            }).catch(() => { });
        }
    }

    // Check if anyone else is still active in the room
    const m = await Meeting.findOne({ roomId }).lean();
    if (m && m.status === 'active') {
        const stillIn = m.participants.some(p => p.isActive);
        if (!stillIn) {
            console.log(`[EXIT] Last user left room ${roomId}. Ending meeting.`);
            await endMeeting(roomId);
        }
    }
};

export const reassignHost = async ({ roomId, newHostSocketId, newHostUserId }) => {
    patchCachedRoom(roomId, { hostId: newHostUserId, hostSocketId: newHostSocketId });
    Meeting.updateOne(
        { roomId },
        { $set: { hostId: newHostUserId, hostSocketId: newHostSocketId } }
    ).catch(() => { });
};

export const leaveMeeting = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.auth.userId;
        await participantLeft({ roomId, userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to leave' });
    }
};

export const finishMeeting = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.auth.userId;

        const meeting = await Meeting.findOne({ roomId });
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        const isParticipant = meeting.participants.some(p => p.userId === userId && p.isActive);
        if (meeting.hostId !== userId && !isParticipant) {
            return res.status(403).json({ error: 'Unauthorized to end this meeting' });
        }

        await endMeeting(roomId);
        res.json({ success: true });
    } catch (err) {
        console.error('[END ERROR]', err);
        res.status(500).json({ error: 'Failed to end meeting' });
    }
};

export const endMeeting = async (roomId) => {
    console.log(`[STATUS] Terminating room ${roomId}...`);
    // 1. Update DB first
    await Meeting.findOneAndUpdate(
        { roomId },
        { $set: { status: 'ended', endTime: new Date() } }
    ).catch(() => { });

    // 2. Broadcast via Pusher before evicting
    pusher.trigger(`room-${roomId}`, 'meeting-ended', { roomId }).catch(err => {
        console.error('[PUSHER] End meeting trigger error:', err);
    });

    // 3. Kill room cache
    evictRoom(roomId);

    // 4. Clear ALL history cache to be safe
    invalidateAllHistory();
    console.log(`[STATUS] Room ${roomId} terminated successfully.`);
};

export const saveChatMessage = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { text, senderName, senderAvatar } = req.body;
        const senderId = req.auth.userId;
        const chatMsg = { senderId, senderName, senderAvatar, text, timestamp: new Date() };

        await Meeting.updateOne(
            { roomId },
            { $push: { chat: chatMsg } }
        );

        // Broadcast via Pusher
        pusher.trigger(`room-${roomId}`, 'chat-message', chatMsg).catch(err => {
            console.error('[PUSHER] Trigger error:', err);
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save message' });
    }
};

export const savePersonalNotes = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { content } = req.body;
        const userId = req.auth.userId;
        const userName = req.headers['x-user-name'] || 'User';
        const userAvatar = req.headers['x-user-avatar'] || '';

        const meeting = await Meeting.findOne({ roomId });
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        const noteIdx = meeting.personalNotes.findIndex(n => n.userId === userId);
        if (noteIdx >= 0) {
            meeting.personalNotes[noteIdx].content = content;
            meeting.personalNotes[noteIdx].userName = userName;
            meeting.personalNotes[noteIdx].userAvatar = userAvatar;
        } else {
            meeting.personalNotes.push({ userId, userName, userAvatar, content });
        }

        await meeting.save();
        res.json({ success: true, notes: content });
    } catch (err) {
        console.error('[NOTES ERROR]', err);
        res.status(500).json({ error: 'Failed to save notes' });
    }
};

export const getPersonalNotes = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.auth.userId;

        const meeting = await Meeting.findOne({ roomId }).select('personalNotes').lean();
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        const note = meeting.personalNotes?.find(n => n.userId === userId);
        res.json({ content: note?.content || '' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
};

export { Meeting };
