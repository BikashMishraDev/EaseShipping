import { ZodError } from 'zod';
import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, 'Validation failed', r.error.flatten());
  return r.data;
}
export function oid(id) {
  if (!mongoose.isValidObjectId(id) || String(id).length !== 24) throw new HttpError(404, 'Not found');
  return id;
}
export function notFound(_req, res) { res.status(404).json({ error: 'Not found' }); }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large' });
  if (err?.name === 'MulterError') return res.status(400).json({ error: 'Upload failed' });
  console.error('Unhandled error:', err?.name, err?.message); // never log bodies or secrets
  res.status(500).json({ error: 'Internal server error' });
}
