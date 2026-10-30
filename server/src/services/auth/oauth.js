import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { User } from '../../models/User.js';

const rand = (n = 24) => crypto.randomBytes(n).toString('base64url');

export const googleConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const metaConfigured = () => Boolean(env.META_APP_ID && env.META_APP_SECRET);

const gClient = () => new OAuth2Client({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_CALLBACK_URL });

/** Google: authorization code flow + OIDC with state, nonce and PKCE (S256). */
export function googleStart() {
  const state = rand(); const nonce = rand(); const verifier = rand(32);
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const url = gClient().generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' });
  return { url, saved: { provider: 'google', state, nonce, verifier } };
}

export async function googleFinish(code, saved) {
  const client = gClient();
  const { tokens } = await client.getToken({ code, codeVerifier: saved.verifier });
  if (!tokens.id_token) throw new Error('missing id_token');
  // Verifies signature, issuer, audience and expiry.
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.sub || p.nonce !== saved.nonce) throw new Error('nonce mismatch');
  return { subject: p.sub, name: p.name, email: p.email, emailVerified: Boolean(p.email_verified), avatarUrl: p.picture };
}

const graph = (path) => `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${path}`;

/** Meta: Facebook Login authorization code flow with state; code exchanged and verified server-side. */
export function metaStart() {
  const state = rand();
  const q = new URLSearchParams({ client_id: env.META_APP_ID, redirect_uri: env.META_CALLBACK_URL, state, scope: 'public_profile,email', response_type: 'code' });
  return { url: `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth?${q}`, saved: { provider: 'meta', state } };
}

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Meta HTTP ${r.status}`);
  return r.json();
}

export async function metaFinish(code) {
  const tok = await getJson(`${graph('oauth/access_token')}?${new URLSearchParams({ client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, redirect_uri: env.META_CALLBACK_URL, code })}`);
  const access = tok.access_token;
  if (!access) throw new Error('no access token');
  // Confirm the token was issued to our app.
  const dbg = await getJson(`${graph('debug_token')}?${new URLSearchParams({ input_token: access, access_token: `${env.META_APP_ID}|${env.META_APP_SECRET}` })}`);
  if (!dbg.data?.is_valid || String(dbg.data.app_id) !== String(env.META_APP_ID)) throw new Error('token not valid for this app');
  const proof = crypto.createHmac('sha256', env.META_APP_SECRET).update(access).digest('hex');
  const me = await getJson(`${graph('me')}?${new URLSearchParams({ fields: 'id,name,email,picture.width(200)', access_token: access, appsecret_proof: proof })}`);
  if (!me.id) throw new Error('no profile id');
  // Facebook does not assert email verification, so emailVerified stays false.
  return { subject: me.id, name: me.name, email: me.email, emailVerified: false, avatarUrl: me.picture?.data?.url };
}

/** Find the user by provider identity only (never by email). Creates a user and workspace on first login. */
export async function upsertUser(provider, p) {
  let user = await User.findOne({ identities: { $elemMatch: { provider, subject: p.subject } } });
  if (!user) {
    user = new User({
      name: p.name || 'New user', email: p.email, emailVerified: p.emailVerified, avatarUrl: p.avatarUrl,
      identities: [{ provider, subject: p.subject, email: p.email }],
      workspace: { name: `${p.name || 'My'} workspace`, createdAt: new Date() },
    });
  } else {
    user.name = p.name || user.name; user.avatarUrl = p.avatarUrl || user.avatarUrl;
    if (p.email) { user.email = p.email; user.emailVerified = p.emailVerified; }
  }
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}
