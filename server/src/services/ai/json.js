/** Pull the first JSON object out of a model reply (tolerates code fences). */
export function extractJson(text) {
  const t = String(text ?? '').replace(/```(?:json)?/gi, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No JSON object found');
  return JSON.parse(t.slice(a, b + 1));
}

