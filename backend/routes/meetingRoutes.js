import express from 'express';
import mongoose from 'mongoose';
import Meeting from '../models/Meeting.js';
import {
    getMeetingHistory, scheduleMeeting, joinMeeting, finishMeeting, leaveMeeting,
    saveChatMessage, savePersonalNotes, getPersonalNotes
} from '../controllers/meetingController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import pusher from '../pusher.js';

const router = express.Router();

router.get('/history', authMiddleware, getMeetingHistory);
router.post('/schedule', authMiddleware, scheduleMeeting);
router.post('/join', authMiddleware, joinMeeting);
router.post('/leave/:roomId', authMiddleware, leaveMeeting);
router.post('/end/:roomId', authMiddleware, finishMeeting);
router.post('/chat/:roomId', authMiddleware, saveChatMessage);
router.post('/notes/:roomId', authMiddleware, savePersonalNotes);
router.get('/notes/:roomId', authMiddleware, getPersonalNotes);
router.get('/chat/:roomId', authMiddleware, async (req, res) => {
    try {
        const { roomId } = req.params;
        const meeting = await Meeting.findOne({ roomId }).select('chat').lean();
        res.json(meeting?.chat || []);
    } catch (err) {
        console.error('[POLL] Chat fetch failed:', err);
        res.status(500).json({ error: 'Failed' });
    }
});
router.get('/participants/:roomId', authMiddleware, async (req, res) => {
    try {
        const { roomId } = req.params;
        const meeting = await Meeting.findOne({ roomId }).select('participants').lean();
        res.json(meeting?.participants || []);
    } catch (err) {
        console.error('[POLL] Participants fetch failed:', err);
        res.status(500).json({ error: 'Failed' });
    }
});
router.post('/react/:roomId', authMiddleware, (req, res) => {
    const { roomId } = req.params;
    const { key, name } = req.body;
    pusher.trigger(`room-${roomId}`, 'react', { key, name });
    res.json({ success: true });
});
router.post('/state/:roomId', authMiddleware, (req, res) => {
    const { roomId } = req.params;
    const { uid, state } = req.body;
    pusher.trigger(`room-${roomId}`, 'state', { uid, state });
    res.json({ success: true });
});
router.post('/profile/:roomId', authMiddleware, (req, res) => {
    const { roomId } = req.params;
    const { uid, name, pic } = req.body;
    pusher.trigger(`room-${roomId}`, 'profile', { uid, name, pic });
    res.json({ success: true });
});

router.post('/admin-mute/:roomId', authMiddleware, (req, res) => {
    const { roomId } = req.params;
    const { targetUid, action } = req.body;
    pusher.trigger(`room-${roomId}`, 'admin-mute', { targetUid, action });
    res.json({ success: true });
});

export default router;
