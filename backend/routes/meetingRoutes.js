import express from 'express';
import { getMeetingHistory, scheduleMeeting, joinMeeting, finishMeeting } from '../controllers/meetingController.js';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

const router = express.Router();

router.get('/history', ClerkExpressWithAuth(), getMeetingHistory);
router.post('/schedule', ClerkExpressWithAuth(), scheduleMeeting);
router.post('/join', ClerkExpressWithAuth(), joinMeeting);
router.post('/end/:roomId', ClerkExpressWithAuth(), finishMeeting);

export default router;
