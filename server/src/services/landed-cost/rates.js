/** Parse a USITC "General" column value into something the calculator can use. Never guesses. */
export function parseGeneralRate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { kind: 'unavailable', raw: s };
  if (/^free$/i.test(s)) return { kind: 'free', percent: '0', raw: s };
  const m = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (m) return { kind: 'ad_valorem', percent: m[1], raw: s };
  return { kind: 'complex', raw: s }; // specific/compound rates need manual entry
}
