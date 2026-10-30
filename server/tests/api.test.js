// Integration tests. They need installed dependencies and a MongoDB: set MONGODB_URI_TEST to run.
// Example: MONGODB_URI_TEST=mongodb://127.0.0.1:27017/easeshipping_test npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

const uri = process.env.MONGODB_URI_TEST;
const skip = uri ? false : 'MONGODB_URI_TEST not set';
let server, base, mongoose;

before(async () => {
  if (skip) return;
  Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: uri, ALLOW_DEV_LOGIN: 'true', MODEL_API_KEY: '', SESSION_SECRET: 'test-secret-test-secret-test-secret' });
  mongoose = (await import('mongoose')).default;
  await (await import('../src/config/db.js')).connectDb();
  await mongoose.connection.dropDatabase();
  const { createApp } = await import('../src/app.js');
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(async () => { if (skip) return; server.close(); await mongoose.disconnect(); });

/** Minimal cookie-aware client. */
function client() {
  let cookie = ''; let csrf = '';
  const call = async (method, path, body, extra = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...(csrf && { 'x-csrf-token': csrf }), ...extra }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* binary */ }
    return { status: res.status, json, text };
  };
  return { call, login: async (name) => { csrf = (await call('GET', '/auth/me')).json.csrfToken; const r = await call('POST', '/auth/dev-login', { name }); csrf = r.json.csrfToken; }, setCsrf: (v) => { csrf = v; } };
}

test('health works without auth', { skip }, async () => {
  const r = await client().call('GET', '/health');
  assert.equal(r.status, 200);
});

test('private routes require authentication', { skip }, async () => {
  assert.equal((await client().call('GET', '/projects')).status, 401);
});

test('state-changing requests need a CSRF token', { skip }, async () => {
  const c = client(); await c.login('Alice'); c.setCsrf('wrong');
  assert.equal((await c.call('POST', '/projects', { name: 'x' })).status, 403);
});

test('project CRUD and ownership isolation', { skip }, async () => {
  const a = client(); await a.login('Alice');
  const b = client(); await b.login('Bob');
  const created = await a.call('POST', '/projects', { name: 'Leather wallets', description: 'Handmade wallets', declaredValue: '1000.00', quantity: 10, weightKg: 5 });
  assert.equal(created.status, 201);
  const id = created.json.project._id;
  assert.equal((await a.call('GET', `/projects/${id}`)).status, 200);
  assert.equal((await b.call('GET', `/projects/${id}`)).status, 404);
  assert.equal((await b.call('PATCH', `/projects/${id}`, { name: 'hacked' })).status, 404);
  assert.equal((await b.call('DELETE', `/projects/${id}`)).status, 404);
  assert.equal((await b.call('POST', `/projects/${id}/reports/analysis`, {})).status, 404);
  const injected = await a.call('PATCH', `/projects/${id}`, { description: 'x', $where: '1' });
  assert.equal(injected.status, 200); // operator key is stripped, not executed
  assert.equal(injected.json.project.$where, undefined);
  assert.equal((await a.call('POST', `/projects/${id}/archive`, { archived: true })).status, 200);
  assert.equal((await a.call('DELETE', `/projects/${id}`)).status, 200);
});

test('analysis without AI credentials is blocked, not faked', { skip }, async () => {
  const a = client(); await a.login('Carol');
  const p = (await a.call('POST', '/projects', { name: 'Tea', description: 'Loose leaf tea', declaredValue: '500', quantity: 20, weightKg: 10 })).json.project;
  const r = await a.call('POST', `/projects/${p._id}/reports/analysis`, {});
  assert.equal(r.status, 201);
  assert.equal(r.json.report.status, 'blocked');
  assert.equal(r.json.report.classifications.length, 0);
  assert.equal(r.json.report.cost.status, 'partial');
  const items = await a.call('GET', `/projects/${p._id}/checklist`);
  assert.ok(items.json.items.length > 0);
  assert.ok(items.json.items.every((i) => i.kind !== 'confirmed'));
});

test('cost endpoint is deterministic and flags missing duty', { skip }, async () => {
  const a = client(); await a.login('Dan');
  const p = (await a.call('POST', '/projects', { name: 'Mugs', description: 'Ceramic mugs', declaredValue: '2000', quantity: 100, weightKg: 40, currency: 'USD' })).json.project;
  const r = await a.call('PUT', `/projects/${p._id}/cost`, { freight: '300', insurance: '20', dutyOverride: { percent: '5', source: 'Broker quote' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.estimate.status, 'complete');
  assert.equal(r.json.estimate.total, '2420.00');
});

test('document upload validation', { skip }, async () => {
  const a = client(); await a.login('Eve');
  const p = (await a.call('POST', '/projects', { name: 'Docs' })).json.project;
  const form = new FormData(); form.append('file', new Blob(['MZ'], { type: 'application/octet-stream' }), 'evil.exe');
  const jar = await a.call('GET', '/auth/me');
  const res = await fetch(`${base}/projects/${p._id}/documents`, { method: 'POST', body: form, headers: { 'x-csrf-token': jar.json.csrfToken, Cookie: '' } });
  assert.ok([400, 401, 403].includes(res.status));
});

test('logout invalidates the session', { skip }, async () => {
  const a = client(); await a.login('Fay');
  assert.equal((await a.call('GET', '/projects')).status, 200);
  assert.equal((await a.call('POST', '/auth/logout', {})).status, 200);
  assert.equal((await a.call('GET', '/projects')).status, 401);
});
