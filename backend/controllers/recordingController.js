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
