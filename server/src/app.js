import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { sanitize } from './middleware/sanitize.js';
import { csrf } from './middleware/csrf.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import system from './routes/system.js';
import auth from './routes/auth.js';
import projects from './routes/projects.js';
import { projectDocs, docs } from './routes/documents.js';
import { projectReports, reports } from './routes/reports.js';
import { projectChecklist, checklist } from './routes/checklist.js';
import dashboard from './routes/dashboard.js';

export function createApp() {
  const app = express();
  const prod = env.NODE_ENV === 'production';
  if (prod) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitize);
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 }));

  app.use(session({
    name: 'es.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ client: mongoose.connection.getClient(), collectionName: 'sessions', ttl: 7 * 24 * 3600 }),
    cookie: { httpOnly: true, secure: prod || env.COOKIE_SAMESITE === 'none', sameSite: env.COOKIE_SAMESITE, maxAge: 7 * 24 * 3600 * 1000 },
  }));

  const v1 = express.Router();
  v1.use(system);
  v1.use(csrf);
  v1.use('/auth', auth);
  v1.use(requireAuth);
  v1.use('/projects/:id/documents', projectDocs);
  v1.use('/projects/:id/reports', projectReports);
  v1.use('/projects/:id/checklist', projectChecklist);
  v1.use('/projects', projects);
  v1.use('/documents', docs);
  v1.use('/reports', reports);
  v1.use('/checklist', checklist);
  v1.use(dashboard);
  app.use('/api/v1', v1);

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
