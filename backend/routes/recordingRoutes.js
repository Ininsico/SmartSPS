import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { saveRecording, getRecordings, deleteRecording, uploadAndSaveRecording } from '../controllers/recordingController.js';

import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/', authMiddleware, getRecordings);
router.post('/save', authMiddleware, saveRecording);
router.post('/upload', authMiddleware, upload.single('file'), uploadAndSaveRecording);
router.delete('/:id', authMiddleware, deleteRecording);

export default router;
