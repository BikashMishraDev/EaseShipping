import { z } from 'zod';
import { env } from '../config/env.js';
import { asyncHandler, HttpError, parse } from '../middleware/errors.js';
import { googleConfigured, metaConfigured, googleStart, googleFinish, metaStart, metaFinish, upsertUser } from '../services/auth/oauth.js';
import crypto from 'node:crypto';

const fail = (res, code) => res.redirect(`${env.CLIENT_URL}/login?error=${code}`);

const save = (req) => new Promise((ok, no) => req.session.save((e) => (e ? no(e) : ok())));
async function startSession(req, user) {
  await new Promise((ok, no) => req.session.regenerate((e) => (e ? no(e) : ok()))); // prevents session fixation
  req.session.userId = String(user._id);
  req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  await save(req);
}

const getMe = asyncHandler(async (req, res) => {
    let user = null;
    if (req.session.userId) {
      const { User } = await import('../models/User.js');
      const u = await User.findById(req.session.userId);
      if (u) user = { id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, avatarUrl: u.avatarUrl, workspace: u.workspace, providers: u.identities.map((i) => i.provider) };
    }
    res.json({ user, csrfToken: req.session.csrfToken });
  })

  const getGoogle = (req, res, next) => {
    if (!googleConfigured()) return fail(res, 'google_not_configured');
    const { url, saved } = googleStart();
    req.session.oauth = saved;
    req.session.save((e) => (e ? next(e) : res.redirect(url)));
  }

  const getGoogleCallback = asyncHandler(async (req, res) => {
    const saved = req.session.oauth; delete req.session.oauth;
    const { code, state, error } = req.query;
    if (error) return fail(res, 'access_denied');
    if (!saved || saved.provider !== 'google' || typeof code !== 'string' || state !== saved.state) return fail(res, 'invalid_state');
    try {
      const user = await upsertUser('google', await googleFinish(code, saved));
      await startSession(req, user);
      res.redirect(`${env.CLIENT_URL}/app`);
    } catch (e) { console.error('Google login failed:', e.message); fail(res, 'login_failed'); }
  })

  const getMeta = (req, res, next) => {
    if (!metaConfigured()) return fail(res, 'meta_not_configured');
    const { url, saved } = metaStart();
    req.session.oauth = saved;
    req.session.save((e) => (e ? next(e) : res.redirect(url)));
  }

  const getMetaCallBack = asyncHandler(async (req, res) => {
    const saved = req.session.oauth; delete req.session.oauth;
    const { code, state, error } = req.query;
    if (error) return fail(res, 'access_denied');
    if (!saved || saved.provider !== 'meta' || typeof code !== 'string' || state !== saved.state) return fail(res, 'invalid_state');
    try {
      const user = await upsertUser('meta', await metaFinish(code));
      await startSession(req, user);
      res.redirect(`${env.CLIENT_URL}/app`);
    } catch (e) { console.error('Meta login failed:', e.message); fail(res, 'login_failed'); }
  })

  //LocalTesting
  const postDevLogin = asyncHandler(async (req, res) => {
    if (!env.ALLOW_DEV_LOGIN || env.NODE_ENV === 'production') throw new HttpError(404, 'Not found');
    const { name } = parse(z.object({ name: z.string().trim().min(1).max(60).default('Dev User') }), req.body);
    const user = await upsertUser('google', { subject: `dev-${name.toLowerCase().replace(/\W+/g, '-')}`, name, email: undefined, emailVerified: false });
    await startSession(req, user);
    res.json({ ok: true, csrfToken: req.session.csrfToken });
  })

  const postDevLogout = (req, res, next) => {
    req.session.destroy((e) => {
      if (e) return next(e);
      res.clearCookie('es.sid');
      res.json({ ok: true });
    });
  }

  export const authController = {
    getMe,
    getGoogle,
    getGoogleCallback,
    getMeta,
    getMetaCallBack,
    postDevLogin,
    postDevLogout
  }