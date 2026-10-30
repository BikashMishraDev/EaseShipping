import mongoose from 'mongoose';

// Dated copy of official USITC responses so a demo survives a USITC outage.
// Cached results are always shown with their original retrieval date.
const s = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  rows: { type: mongoose.Schema.Types.Mixed, default: [] },
  retrievedAt: { type: Date, required: true },
});
export const TariffCache = mongoose.model('TariffCache', s);
