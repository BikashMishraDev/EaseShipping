import mongoose from 'mongoose';
const { Schema } = mongoose;

const source = new Schema({
  id: String, title: String, url: String, authority: String,
  retrievedAt: Date, effectiveDate: String, excerpt: String, limitations: String,
}, { _id: false });

const classification = new Schema({
  htsno: String, description: String, generalRate: String,
  rate: Schema.Types.Mixed, reasoning: String, missingInfo: [String],
  confidence: { type: String, enum: ['low', 'medium', 'high', null], default: null },
  sourceIds: [String], flagged: { type: Boolean, default: false }, selected: { type: Boolean, default: false },
}, { _id: false });

const s = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'ExportProject', required: true, index: true },
  status: { type: String, enum: ['complete', 'partial', 'blocked', 'failed'], required: true },
  corridor: String,
  productSnapshot: Schema.Types.Mixed,
  normalizedProduct: Schema.Types.Mixed,
  missingInfo: [Schema.Types.Mixed],
  conflicts: [Schema.Types.Mixed],
  classifications: [classification],
  findings: [Schema.Types.Mixed],
  sources: [source],
  stages: [Schema.Types.Mixed],
  cost: Schema.Types.Mixed,
  summary: [String],
  nextSteps: [String],
  ai: { provider: String, model: String, used: Boolean },
}, { timestamps: true });
s.index({ projectId: 1, createdAt: -1 });

export const AnalysisReport = mongoose.model('AnalysisReport', s);
