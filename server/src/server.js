import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';

try {
  await connectDb();
} catch (e) {
  console.error('Could not connect to MongoDB:', e.message);
  process.exit(1);
}
const app = createApp();
const server = app.listen(env.PORT, () => console.log(`EaseShipping API listening on :${env.PORT}`));
const stop = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
