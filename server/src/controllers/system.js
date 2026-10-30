import { env } from '../config/env.js';
import { dbStatus } from '../config/db.js';
import { aiStatus } from '../services/ai/index.js';
import { googleConfigured, metaConfigured } from '../services/auth/oauth.js';

const getSystemHealth = (_req, res) => res.json({ status: 'ok', db: dbStatus(), uptime: process.uptime() })

const getSystemStatus = (_req, res) => {
    const ai = aiStatus();
    res.json({
      google: googleConfigured(), meta: metaConfigured(), devLogin: env.ALLOW_DEV_LOGIN && env.NODE_ENV !== 'production',
      ai: { configured: ai.configured, provider: ai.provider, model: ai.model },
      ocr: { configured: false },
      sources: { usitc: 'Not checked here. Availability is tested when an analysis runs.' },
      maxUploadMb: env.MAX_UPLOAD_MB,
    });
  }

export const systemController = {
    getSystemHealth,
    getSystemStatus
}