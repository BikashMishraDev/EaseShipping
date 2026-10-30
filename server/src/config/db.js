import mongoose from 'mongoose';
import {env} from './env.js';

export async function connectDb() {
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
}
export const dbStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');
