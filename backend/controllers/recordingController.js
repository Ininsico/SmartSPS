import Recording from '../models/Recording.js';
export const saveRecording = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { roomId, title, duration, url, publicId, thumbnail, size, format } = req.body;

        if (!url || !publicId) return res.status(400).json({ error: 'url and publicId are required' });

        const recording = await Recording.create({
            userId, roomId, title, url, publicId,
            duration: Math.round(parseFloat(duration) || 0),
            size: parseInt(size) || 0,
            format: format || 'mp4',
            thumbnail,
        });

        res.status(201).json(recording);
    } catch (err) {
        console.error('Save recording failed:', err.message);
        res.status(500).json({ error: 'Failed to save recording', detail: err.message });
    }
};

import { v2 as cloudinary } from 'cloudinary';

import streamifier from 'streamifier';

export const uploadAndSaveRecording = async (req, res) => {
    try {
        // Configure Cloudinary inside the function to ensure process.env is fully loaded by dotenv
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        const userId = req.auth.userId;
        const { roomId, title, duration } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No file provided' });
        if (!process.env.CLOUDINARY_CLOUD_NAME) return res.status(500).json({ error: 'Cloudinary config missing on server' });

        console.log(`[REC DB] Backend receiving upload: ${(file.size / 1024 / 1024).toFixed(2)}MB from user ${userId}`);

        // Stream from Vercel memory buffer to Cloudinary using streamifier
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'video', // Note: 'video' handles both audio and video files in Cloudinary
                    folder: 'smartsps/recordings',
                },
                (error, result) => {
                    if (error) {
                        console.error('[REC DB] Cloudinary upload stream error:', error);
                        reject(error);
                    } else resolve(result);
                }
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

        console.log('[REC DB] Cloudinary upload successful:', result.secure_url);

        const format = result.format || 'webm';

        // Save to mongo
        const recording = await Recording.create({
            userId,
            roomId,
            title,
            url: result.secure_url,
            publicId: result.public_id,
            duration: Math.round(parseFloat(duration) || 0),
            size: parseInt(result.bytes) || 0,
            format: format,
            thumbnail: result.secure_url.replace('/upload/', '/upload/f_jpg,w_400/').replace(`.${format}`, '.jpg'),
        });

        // Return URL so frontend can kick off AI
        res.status(201).json({ success: true, url: result.secure_url, recording });
    } catch (err) {
        console.error('[REC DB] Backend upload failed:', err.message);
        res.status(500).json({ error: 'Failed to process and save recording', detail: err.message });
    }
};

export const getRecordings = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const recordings = await Recording.find({ userId }).sort({ createdAt: -1 }).lean();
        res.json(recordings);
    } catch {
        res.status(500).json({ error: 'Failed to fetch recordings' });
    }
};

export const deleteRecording = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const rec = await Recording.findOne({ _id: req.params.id, userId });
        if (!rec) return res.status(404).json({ error: 'Not found' });
        await rec.deleteOne();
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to delete recording' });
    }
};
