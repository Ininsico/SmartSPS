import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { startBot, stopBot, getTranscript, getSavedTranscript, summarize, getStatus, updateTranscript } from '../controllers/vexaController.js';

const router = express.Router();

router.post('/start', authMiddleware, startBot);
router.delete('/stop/:meetingId', authMiddleware, stopBot);
router.get('/transcript/:meetingId', authMiddleware, getTranscript);
router.get('/status/:meetingId', authMiddleware, getStatus);
router.get('/saved/:meetingId', authMiddleware, getSavedTranscript);
router.post('/summarize', authMiddleware, summarize);
router.put('/update/:meetingId', authMiddleware, updateTranscript);

export default router;
