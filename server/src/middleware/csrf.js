import crypto from 'node:crypto';
import { HttpError } from './errors.js';

/** Synchronizer-token CSRF protection tied to the server-side session. */
export function csrf(req, _res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.get('x-csrf-token') || '';
  const want = req.session.csrfToken;
  const ok = sent.length === want.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(want));
  if (!ok) return next(new HttpError(403, 'Invalid or missing CSRF token'));
  next();
}
