import mongoose from 'mongoose';

const identity = new mongoose.Schema({
  provider: { type: String, enum: ['google', 'meta'], required: true },
  subject: { type: String, required: true },
  email: String,
  linkedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, maxlength: 200 },
  email: { type: String, lowercase: true, maxlength: 320 },
  emailVerified: { type: Boolean, default: false },
  avatarUrl: String,
  identities: [identity],
  workspace: { name: String, createdAt: Date },
  lastLoginAt: Date,
}, { timestamps: true });
// Provider identities are unique. Accounts are never merged by email.
userSchema.index({ 'identities.provider': 1, 'identities.subject': 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
