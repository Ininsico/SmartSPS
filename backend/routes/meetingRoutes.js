import express from 'express';
import { getMeetingHistory, scheduleMeeting } from '../controllers/meetingController.js';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

const router = express.Router();

router.get('/history', ClerkExpressWithAuth(), getMeetingHistory);
router.post('/schedule', ClerkExpressWithAuth(), scheduleMeeting);

export default router;
