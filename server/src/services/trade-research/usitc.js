// Adapter for the USITC Harmonized Tariff Schedule search API (official US source).
// NOTE: written against the public REST endpoint used by hts.usitc.gov; parse defensively and
// treat any failure as "source unavailable". Verify the response shape on first run.
const BASE = 'https://hts.usitc.gov/reststop/search';

export const SOURCE_INFO = {
  authority: 'U.S. International Trade Commission (HTSUS)',
  urlFor: (htsno) => `https://hts.usitc.gov/search?query=${encodeURIComponent(htsno)}`,
};

export function normalizeRows(json) {
  if (!Array.isArray(json)) return [];
  return json
    .map((r) => ({
      htsno: String(r.htsno ?? '').trim(),
      description: String(r.description ?? '').replace(/<[^>]*>/g, '').trim(),
      general: String(r.general ?? '').trim(),
      special: String(r.special ?? '').trim(),
      other: String(r.other ?? '').trim(),
      units: Array.isArray(r.units) ? r.units.join(', ') : String(r.units ?? ''),
    }))
    .filter((r) => r.htsno && r.htsno.replace(/\./g, '').length >= 6);
}

export async function searchHts(keyword) {
  const res = await fetch(`${BASE}?keyword=${encodeURIComponent(keyword)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`USITC responded with HTTP ${res.status}`);
  return normalizeRows(await res.json());
}
