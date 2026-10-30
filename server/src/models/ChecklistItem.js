import mongoose from 'mongoose';

const s = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportProject', required: true, index: true },
  key: { type: String, required: true },
  requirement: { type: String, required: true, maxlength: 300 },
  explanation: { type: String, maxlength: 2000 },
  kind: { type: String, enum: ['confirmed', 'recommendation', 'verify'], default: 'verify' },
  status: { type: String, enum: ['pending', 'completed', 'needs_review', 'unable_to_verify'], default: 'pending' },
  source: { title: String, url: String, effectiveDate: String, retrievedAt: Date },
  notes: { type: String, maxlength: 2000, default: '' },
  userEdited: { type: Boolean, default: false },
}, { timestamps: true });
s.index({ projectId: 1, key: 1 }, { unique: true });

export const ChecklistItem = mongoose.model('ChecklistItem', s);
