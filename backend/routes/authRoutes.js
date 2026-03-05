import express from 'express';
import jwt from 'jsonwebtoken';
// import { OAuth2Client } from 'google-auth-library'; // Google auth — temporarily disabled
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const upload = multer({ storage: multer.memoryStorage() });
// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Google auth — temporarily disabled

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        const exists = await User.findOne({ email: email.toLowerCase().trim() });
        if (exists) return res.status(400).json({ error: 'An account with this email already exists' });

        const user = new User({ email: email.toLowerCase().trim(), password, name: name.trim() });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } });
    } catch (err) {
        console.error('[AUTH] Registration error:', err);
        // Handle MongoDB duplicate key error gracefully
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0];
            const message = field === 'email' ? 'An account with this email already exists' : `Duplicate entry for ${field}`;
            return res.status(400).json({ error: message });
        }
        res.status(500).json({ error: `Registration failed: ${err.message}` });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Google OAuth — temporarily disabled
// router.post('/google', async (req, res) => {
//     try {
//         const { credential } = req.body;
//         if (!credential) return res.status(400).json({ error: 'No Google credential provided' });
//
//         const ticket = await googleClient.verifyIdToken({
//             idToken: credential,
//             audience: process.env.GOOGLE_CLIENT_ID,
//         });
//         const payload = ticket.getPayload();
//         const { sub: googleId, email, name, picture } = payload;
//
//         let user = await User.findOne({ googleId });
//         if (!user) {
//             user = await User.findOne({ email });
//             if (user) {
//                 user.googleId = googleId;
//                 if (!user.avatar || user.avatar === '/defaultpic.png') user.avatar = picture;
//                 await user.save();
//             } else {
//                 user = await User.create({
//                     email,
//                     name,
//                     googleId,
//                     avatar: picture || '/defaultpic.png',
//                     password: null,
//                 });
//             }
//         }
//
//         const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
//         res.json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } });
//     } catch (err) {
//         console.error('Google auth failed:', err.message);
//         res.status(401).json({ error: 'Google authentication failed' });
//     }
// });

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ id: user._id, email: user.email, name: user.name, avatar: user.avatar });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Update profile (avatar)
router.put('/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.auth.userId;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No avatar file provided' });

        // Configure Cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'smartsps/avatars',
                    transformation: [{ width: 250, height: 250, crop: 'fill' }]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: result.secure_url },
            { new: true }
        ).select('-password');

        res.json({ id: user._id, email: user.email, name: user.name, avatar: user.avatar });
    } catch (err) {
        console.error('Profile update failed:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
