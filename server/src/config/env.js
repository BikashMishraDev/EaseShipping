import 'dotenv/config';
import crypto from 'node:crypto';
import { z } from 'zod';

const opt = z.string().trim().optional().transform((v) => v || undefined);
const bool = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');
const client = process.env.CLIENT_URL || 'http://localhost:5173';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: opt,
  SESSION_SECRET: opt,
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  GOOGLE_CLIENT_ID: opt,
  GOOGLE_CLIENT_SECRET: opt,
  GOOGLE_CALLBACK_URL: z.string().url().default(`${client}/api/v1/auth/google/callback`),
  META_APP_ID: opt,
  META_APP_SECRET: opt,
  META_CALLBACK_URL: z.string().url().default(`${client}/api/v1/auth/meta/callback`),
  META_GRAPH_VERSION: z.string().default('v23.0'),
  MODEL_API_KEY: opt,
  AI_BASE_URL: z.string().url().default('https://api.meta.ai/v1'),
  AI_MODEL: z.string().default('muse-spark-1.3'),
  AI_REASONING_EFFORT: opt,
  ALLOW_DEV_LOGIN: bool,
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
if (!env.SESSION_SECRET) {
  if (env.NODE_ENV === 'production') { console.error('SESSION_SECRET is required in production'); process.exit(1); }
  env.SESSION_SECRET = crypto.randomBytes(32).toString('hex'); // dev only; sessions reset on restart
}
if (env.NODE_ENV === 'production' && env.ALLOW_DEV_LOGIN) { console.error('ALLOW_DEV_LOGIN must be false in production'); process.exit(1); }
