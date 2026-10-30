/** Strips Mongo operator keys ($...) and dotted keys from request input (NoSQL injection defense). */
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) if (!k.startsWith('$') && !k.includes('.')) out[k] = clean(val);
    return out;
  }
  return v;
}
export function sanitize(req, _res, next) {
  if (req.body) req.body = clean(req.body);
  if (req.query) {
    const q = clean(req.query);
    for (const k of Object.keys(req.query)) delete req.query[k];
    Object.assign(req.query, q);
  }
  next();
}
export { clean };
