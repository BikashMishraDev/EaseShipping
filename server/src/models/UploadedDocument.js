import mongoose from 'mongoose';

const s = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportProject', required: true, index: true },
  docType: { type: String, enum: ['commercial_invoice', 'spec_sheet', 'ingredient_list', 'shipping_document', 'other'], default: 'other' },
  filename: { type: String, required: true, maxlength: 255 },
  mimeType: String,
  size: Number,
  sha256: String,
  data: { type: Buffer, select: false }, // private storage lives in MongoDB (works on serverless hosts)
  text: { type: String, select: false },
  textStatus: { type: String, enum: ['extracted', 'no_text', 'unsupported'], default: 'no_text' },
  textNote: String,
  extraction: {
    status: { type: String, enum: ['none', 'done', 'failed'], default: 'none' },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} }, // { field: { value, quote, quoteVerified } }
    conflicts: [mongoose.Schema.Types.Mixed],
    missing: [String],
    error: String,
    extractedAt: Date,
  },
  confirmed: { type: Boolean, default: false },
}, { timestamps: true });

export const UploadedDocument = mongoose.model('UploadedDocument', s);
