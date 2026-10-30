// Decimal-safe money helpers. All arithmetic uses BigInt integer minor units.
// Rounding rule: half away from zero, applied once per line item.
const EXPONENTS = { USD: 2, INR: 2, EUR: 2, GBP: 2, CAD: 2, AUD: 2, SGD: 2, AED: 2, CNY: 2, JPY: 0, KRW: 0 };

export function exponentOf(currency) {
  const e = EXPONENTS[currency];
  if (e === undefined) throw new Error(`Unsupported currency: ${currency}`);
  return e;
}
export const supportedCurrencies = () => Object.keys(EXPONENTS);

/** Parse a non-negative decimal string into { n: BigInt, scale }. */
export function parseDecimal(str) {
  const s = String(str ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid decimal: "${str}"`);
  const [i, f = ''] = s.split('.');
  return { n: BigInt(i + f), scale: f.length };
}

/** Half-up division for non-negative BigInts. */
export function roundDiv(num, den) {
  return (2n * num + den) / (2n * den);
}

/** Exact conversion of a decimal string to minor units. Rejects excess precision. */
export function toMinor(str, currency) {
  const exp = exponentOf(currency);
  const { n, scale } = parseDecimal(str);
  if (scale > exp) throw new Error(`${currency} allows at most ${exp} decimal places`);
  return n * 10n ** BigInt(exp - scale);
}

export function formatMinor(minor, currency) {
  const exp = exponentOf(currency);
  const s = minor.toString().padStart(exp + 1, '0');
  return exp === 0 ? s : `${s.slice(0, -exp)}.${s.slice(-exp)}`;
}

/** Convert minor units of `from` into USD minor units; rate = USD per 1 unit of `from`. */
export function convertToUsdMinor(minor, from, rateStr) {
  if (from === 'USD') return minor;
  const r = parseDecimal(rateStr);
  if (r.n === 0n) throw new Error('Exchange rate must be greater than zero');
  const num = minor * r.n * 100n;
  const den = 10n ** BigInt(r.scale) * 10n ** BigInt(exponentOf(from));
  return roundDiv(num, den);
}

/** percent string ("6.5") applied to a minor-unit base. */
export function percentOf(baseMinor, percentStr) {
  const p = parseDecimal(percentStr);
  return roundDiv(baseMinor * p.n, 100n * 10n ** BigInt(p.scale));
}
