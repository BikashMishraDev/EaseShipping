// Pure helpers for USITC "reststop" rows. No network or database access, so they are easy to test.
const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
export const digits = (htsno) => String(htsno ?? '').replace(/\D/g, '');
export const chapterOf = (htsno) => Number(digits(htsno).slice(0, 2));
// Chapters 98 and 99 hold special provisions and temporary measures, not product classifications.
export const isClassifiable = (r) => r.htsno && chapterOf(r.htsno) >= 1 && chapterOf(r.htsno) <= 97;

/** Keep every real line (headings included) so the indent hierarchy survives. */
export function normalizeRows(json) {
  if (!Array.isArray(json)) return [];
  return json
    .filter((r) => r && String(r.htsno ?? '').trim())
    .map((r) => ({
      htsno: String(r.htsno).trim(),
      indent: Number.parseInt(r.indent, 10) || 0,
      description: strip(r.description),
      general: strip(r.general),
      special: strip(r.special),
      other: strip(r.other),
      units: Array.isArray(r.units) ? r.units.map(strip).filter(Boolean) : [],
      footnotes: Array.isArray(r.footnotes) ? r.footnotes.map((f) => ({ columns: f.columns || [], value: strip(f.value) })) : [],
    }));
}

/** Most frequent 4-digit headings among classifiable keyword hits (first-seen order breaks ties). */
export function pickHeadings(rows, max = 4) {
  const count = new Map();
  for (const r of rows) {
    if (!isClassifiable(r)) continue;
    const h = digits(r.htsno).slice(0, 4);
    if (h.length === 4) count.set(h, (count.get(h) || 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([h]) => h);
}

/** Walk rows in schedule order and attach the chain of parent descriptions using indent levels. */
export function withPaths(rows) {
  const stack = [];
  return rows.map((r) => {
    while (stack.length && stack[stack.length - 1].indent >= r.indent) stack.pop();
    const path = stack.map((p) => p.description.replace(/:$/, ''));
    stack.push(r);
    return { ...r, path };
  });
}

/** True when a footnote on the General column points at a Chapter 99 measure (additional duties may apply). */
export const hasGeneralChapter99Note = (r) =>
  r.footnotes.some((f) => f.columns.includes('general') && /\b99\d{2}\.\d{2}/.test(f.value));

/** Rate-bearing lines under one heading, each with its full hierarchical description. */
export function leafCandidates(headingRows, heading) {
  const inHeading = headingRows.filter((r) => isClassifiable(r) && digits(r.htsno).startsWith(heading));
  return withPaths(inHeading)
    .filter((r) => r.general)
    .map((r) => ({
      htsno: r.htsno,
      description: [...r.path, r.description].join(' > ').replace(/\s*\(\d{3}\)\s*(?=>|$)/g, ''),
      general: r.general,
      special: r.special,
      units: r.units.join(', '),
      additionalDutyNote: hasGeneralChapter99Note(r),
    }));
}

const isoFromUs = (d) => {
  const m = String(d ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
};

/** Pick the release marked "current" from /reststop/releaseList. Returns null if the shape is not recognized. */
export function parseCurrentRelease(json) {
  if (!Array.isArray(json)) return null;
  const r = json.find((x) => x && x.status === 'current');
  if (!r || !r.name) return null;
  return { name: String(r.name), title: String(r.title || r.name), effectiveFrom: isoFromUs(r.releaseStartDate) };
}
