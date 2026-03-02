import express from 'express';
import { getMeetingHistory } from '../controllers/meetingController.js';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

const router = express.Router();

router.get('/history', ClerkExpressWithAuth(), getMeetingHistory);

export default router;
