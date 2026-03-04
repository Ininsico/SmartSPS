import express from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { saveRecording, getRecordings, deleteRecording, uploadAndSaveRecording } from '../controllers/recordingController.js';

import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/', ClerkExpressWithAuth(), getRecordings);
router.post('/save', ClerkExpressWithAuth(), saveRecording);
router.post('/upload', ClerkExpressWithAuth(), upload.single('file'), uploadAndSaveRecording);
router.delete('/:id', ClerkExpressWithAuth(), deleteRecording);

export default router;
