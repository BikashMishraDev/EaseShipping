import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRows, pickHeadings, withPaths, leafCandidates, isClassifiable, hasGeneralChapter99Note } from '../src/services/trade-research/hts-parse.js';

// Trimmed from a live hts.usitc.gov response for keyword=6214 (public data).
const raw = (o) => ({ additionalDuties: null, footnotes: [], general: null, other: null, special: null, units: null, ...o });
const heading = [
  raw({ htsno: '6214', indent: '0', description: 'Shawls, scarves, mufflers, mantillas, veils and the like:' }),
  raw({ htsno: '6214.10', indent: '1', description: 'Of silk or silk waste:' }),
  raw({ htsno: '6214.10.10.00', indent: '2', description: 'Containing 70 percent or more by weight of silk or silk waste', general: '1.2%', other: '65%', units: ['doz.', 'kg'] }),
  raw({ htsno: '6214.10.20.00', indent: '2', description: 'Other (859)', general: '3.9%', units: ['doz.', '<u>kg</u>'] }),
  raw({ htsno: '6214.20.00.00', indent: '1', description: 'Of wool or fine animal hair (459)', general: '6.7%' }),
  raw({ htsno: '9902.13.69', indent: '0', description: 'Women\'s shawls, scarves and similar goods, wholly of silk (provided for in subheading 6214.10.10)', general: 'Free' }),
];

test('normalizeRows keeps headings, strips HTML and parses indent', () => {
  const rows = normalizeRows(heading);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].indent, 0);
  assert.deepEqual(rows[3].units, ['doz.', 'kg']);
});

test('chapter 98/99 lines are not classification candidates', () => {
  const rows = normalizeRows(heading);
  assert.equal(isClassifiable(rows[5]), false);
  assert.equal(isClassifiable(rows[2]), true);
});

test('pickHeadings ranks headings by keyword hits', () => {
  const rows = normalizeRows([...heading, raw({ htsno: '6117.10', indent: '1', description: 'Shawls, scarves' }), raw({ htsno: '6214.90', indent: '1', description: 'Of other textile materials' })]);
  assert.equal(pickHeadings(rows, 2)[0], '6214');
});

test('leaf candidates carry the full hierarchy so "Other" is not ambiguous', () => {
  const c = leafCandidates(normalizeRows(heading), '6214');
  const other = c.find((x) => x.htsno === '6214.10.20.00');
  assert.equal(other.description, 'Shawls, scarves, mufflers, mantillas, veils and the like > Of silk or silk waste > Other');
  assert.equal(other.general, '3.9%');
  assert.equal(c.find((x) => x.htsno === '9902.13.69'), undefined);
  assert.equal(c.length, 3);
});

test('withPaths resets the chain when indent decreases', () => {
  const p = withPaths(normalizeRows(heading));
  assert.deepEqual(p[4].path, ['Shawls, scarves, mufflers, mantillas, veils and the like']);
});

test('Chapter 99 note on the General column is flagged, other columns are not', () => {
  const g = normalizeRows([raw({ htsno: '1234.56.78', description: 'x', general: '5%', footnotes: [{ columns: ['general'], value: 'See 9903.88.01.' }] })])[0];
  const o = normalizeRows([raw({ htsno: '1234.56.78', description: 'x', general: '5%', footnotes: [{ columns: ['other'], value: 'See 9903.90.08.' }] })])[0];
  assert.equal(hasGeneralChapter99Note(g), true);
  assert.equal(hasGeneralChapter99Note(o), false);
});

import { parseCurrentRelease } from '../src/services/trade-research/hts-parse.js';
test('current HTS release is read from the release list', () => {
  const r = parseCurrentRelease([
    { name: '2026HTSRev22', title: 'Revision 22 (2026)', status: 'current', releaseStartDate: '10/30/2026' },
    { name: '2026HTSRev21', title: 'Revision 21 (2026)', status: 'archive', releaseStartDate: '10/09/2026' },
  ]);
  assert.deepEqual(r, { name: '2026HTSRev22', title: 'Revision 22 (2026)', effectiveFrom: '2026-10-30' });
  assert.equal(parseCurrentRelease([{ status: 'archive', name: 'x' }]), null);
  assert.equal(parseCurrentRelease({ nope: 1 }), null);
});
