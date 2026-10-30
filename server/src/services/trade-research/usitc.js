// Adapter for the USITC Harmonized Tariff Schedule REST search (official US source).
// Verified against live responses: keyword search is a literal substring match on descriptions
// and HTS numbers, so searches must use the schedule's own wording (e.g. "scarves", not "scarf").
import { TariffCache } from '../../models/TariffCache.js';
import { digits, leafCandidates, normalizeRows, parseCurrentRelease, pickHeadings } from './hts-parse.js';

const BASE = 'https://hts.usitc.gov/reststop/search';
const RELEASES = 'https://hts.usitc.gov/reststop/releaseList';

export const SOURCE_INFO = {
  authority: 'U.S. International Trade Commission (HTSUS)',
  urlFor: (htsno) => `https://hts.usitc.gov/search?query=${encodeURIComponent(htsno)}`,
};

async function live(keyword) {
  const res = await fetch(`${BASE}?keyword=${encodeURIComponent(keyword)}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`USITC responded with HTTP ${res.status}`);
  return normalizeRows(await res.json());
}

/** Live lookup, saved with its retrieval date. If USITC is unreachable, falls back to the dated copy. */
export async function cachedSearch(keyword) {
  const key = String(keyword).trim().toLowerCase();
  try {
    const rows = await live(key);
    const retrievedAt = new Date();
    await TariffCache.updateOne({ key }, { key, rows, retrievedAt }, { upsert: true }).catch(() => {});
    return { rows, retrievedAt, stale: false };
  } catch (e) {
    const hit = await TariffCache.findOne({ key }).lean().catch(() => null);
    if (hit) return { rows: hit.rows, retrievedAt: hit.retrievedAt, stale: true };
    throw e;
  }
}

/**
 * Two-step retrieval:
 * 1. keyword searches (schedule wording) to find likely 4-digit headings;
 * 2. fetch each heading's full subtree so every candidate line carries its parent descriptions.
 */
export async function retrieveCandidates(keywords, { maxHeadings = 4, maxRows = 60 } = {}) {
  const notes = [];
  let stale = false;
  let oldest = null;
  const track = (r) => { stale ||= r.stale; if (!oldest || r.retrievedAt < oldest) oldest = r.retrievedAt; };

  const hits = [];
  for (const kw of keywords) {
    try { const r = await cachedSearch(kw); track(r); hits.push(...r.rows); }
    catch (e) { notes.push(`${kw}: ${e.message}`); }
  }
  const headings = pickHeadings(hits, maxHeadings);
  const candidates = [];
  for (const h of headings) {
    try {
      const r = await cachedSearch(h);
      track(r);
      // A number search also matches descriptions that mention the code, so keep only lines inside the heading.
      candidates.push(...leafCandidates(r.rows.filter((x) => digits(x.htsno).startsWith(h)), h));
    } catch (e) { notes.push(`heading ${h}: ${e.message}`); }
  }
  return { candidates: candidates.slice(0, maxRows), headings, notes, stale, retrievedAt: oldest || new Date() };
}

/** Current HTS revision (name and start date). Live first, then the dated copy; null if neither is available. */
export async function currentRelease() {
  const key = 'release:current';
  try {
    const res = await fetch(RELEASES, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const release = parseCurrentRelease(await res.json());
    if (!release) throw new Error('unrecognized release list');
    await TariffCache.updateOne({ key }, { key, rows: release, retrievedAt: new Date() }, { upsert: true }).catch(() => {});
    return release;
  } catch {
    const hit = await TariffCache.findOne({ key }).lean().catch(() => null);
    return hit?.rows?.name ? hit.rows : null;
  }
}

export const releaseLabel = (r) => (r ? `${r.title}${r.effectiveFrom ? `, in effect from ${r.effectiveFrom}` : ''}` : null);
