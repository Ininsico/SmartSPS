import express from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { startBot, stopBot, getTranscript, getSavedTranscript, summarize, getStatus } from '../controllers/vexaController.js';

const router = express.Router();

router.post('/start', ClerkExpressWithAuth(), startBot);
router.delete('/stop/:meetingId', ClerkExpressWithAuth(), stopBot);
router.get('/transcript/:meetingId', ClerkExpressWithAuth(), getTranscript);
router.get('/status/:meetingId', ClerkExpressWithAuth(), getStatus);
router.get('/saved/:meetingId', ClerkExpressWithAuth(), getSavedTranscript);
router.post('/summarize', ClerkExpressWithAuth(), summarize);

export default router;
