import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    roomId: { type: String, required: true },
    title: { type: String, default: 'Meeting Recording' },
    url: { type: String, required: true },   // Cloudinary secure URL
    publicId: { type: String, required: true },   // Cloudinary public_id (for deletion)
    duration: { type: Number, default: 0 },       // seconds
    size: { type: Number, default: 0 },       // bytes
    format: { type: String, default: 'webm' },
    thumbnail: { type: String },                   // Cloudinary thumbnail URL
}, { timestamps: true });

recordingSchema.index({ userId: 1, createdAt: -1 });

const Recording = mongoose.model('Recording', recordingSchema);
export default Recording;
