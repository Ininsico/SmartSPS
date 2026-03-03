import express from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { saveRecording, getRecordings, deleteRecording } from '../controllers/recordingController.js';

const router = express.Router();

router.get('/', ClerkExpressWithAuth(), getRecordings);
router.post('/save', ClerkExpressWithAuth(), saveRecording);   
router.delete('/:id', ClerkExpressWithAuth(), deleteRecording);

export default router;
