import mongoose from 'mongoose';

const s = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, maxlength: 120 },
  description: { type: String, maxlength: 4000, default: '' },
  category: { type: String, maxlength: 120, default: '' },
  materials: [String],
  ingredients: [String],
  originCountry: { type: String, default: 'IN', uppercase: true, minlength: 2, maxlength: 2 },
  destinationCountry: { type: String, default: 'US', uppercase: true, minlength: 2, maxlength: 2 },
  declaredValue: { type: String, default: null }, // decimal string in `currency`
  currency: { type: String, default: 'USD', uppercase: true },
  quantity: { type: Number, default: null },
  weightKg: { type: Number, default: null },
  packaging: { type: { type: String, default: '' }, notes: { type: String, default: '' } },
  costInputs: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['draft', 'ready', 'analyzed'], default: 'draft' },
  archivedAt: { type: Date, default: null },
}, { timestamps: true });
s.index({ userId: 1, updatedAt: -1 });

export const ExportProject = mongoose.model('ExportProject', s);
