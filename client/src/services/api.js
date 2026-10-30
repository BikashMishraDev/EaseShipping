export const BASE = import.meta.env.VITE_API_URL ?? '';
let csrf = '';

export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

/** Field-level messages from a zod "Validation failed" response. */
export function fieldErrors(err) {
  const f = err?.details?.fieldErrors || {};
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v[0]]));
}

export async function loadMe() {
  const res = await fetch(`${BASE}/api/v1/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'Could not reach the server');
  const data = await res.json();
  csrf = data.csrfToken || '';
  return data;
}

export async function api(path, { method = 'GET', body, form } = {}) {
  if (method !== 'GET' && !csrf) await loadMe();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['x-csrf-token'] = csrf;
  let res;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, { method, credentials: 'include', headers, body: form || (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the API is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || res.statusText, data.details);
  return data;
}

export const setCsrf = (t) => { csrf = t; };
