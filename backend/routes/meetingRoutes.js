import express from 'express';
import { getMeetingHistory, scheduleMeeting, joinMeeting, finishMeeting, saveChatMessage } from '../controllers/meetingController.js';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

const router = express.Router();

router.get('/history', ClerkExpressWithAuth(), getMeetingHistory);
router.post('/schedule', ClerkExpressWithAuth(), scheduleMeeting);
router.post('/join', ClerkExpressWithAuth(), joinMeeting);
router.post('/end/:roomId', ClerkExpressWithAuth(), finishMeeting);
router.post('/chat/:roomId', ClerkExpressWithAuth(), saveChatMessage);

export default router;
