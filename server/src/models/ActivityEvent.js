import mongoose from 'mongoose';

const s = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportProject' },
  type: String,
  message: { type: String, maxlength: 300 },
}, { timestamps: { createdAt: true, updatedAt: false } });
s.index({ userId: 1, createdAt: -1 });

export const ActivityEvent = mongoose.model('ActivityEvent', s);
export const logActivity = (userId, projectId, type, message) =>
  ActivityEvent.create({ userId, projectId, type, message }).catch(() => {});
