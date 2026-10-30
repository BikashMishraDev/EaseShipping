import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from '../src/services/ai/json.js';
import { verifyQuotes, findConflicts } from '../src/services/documents/verify.js';
import { validateUpload } from '../src/services/documents/extract.js';
import { projectMissing } from '../src/services/analysis/missing.js';
import { clean } from '../src/middleware/sanitize.js';

test('extractJson tolerates code fences and rejects non-JSON', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => extractJson('no json here'));
});

test('verifyQuotes flags values whose quote is not in the document', () => {
  const text = 'Invoice 55\nTotal: 1,200.00 USD\nQty 40';
  const out = verifyQuotes({ declaredValue: { value: '1200.00', quote: 'Total: 1,200.00 USD' }, quantity: { value: 99, quote: 'Qty 99' }, buyerName: null }, text);
  assert.equal(out.declaredValue.quoteVerified, true);
  assert.equal(out.quantity.quoteVerified, false);
  assert.equal(out.buyerName, undefined);
});

test('findConflicts surfaces mismatches and ignores missing values', () => {
  const c = findConflicts({ declaredValue: { value: '1500' }, currency: { value: 'usd' }, quantity: { value: 10 } }, { declaredValue: '1200', currency: 'USD', quantity: 10, weightKg: null });
  assert.equal(c.length, 1);
  assert.equal(c[0].field, 'declaredValue');
});

test('upload validation rejects wrong types, mismatched mime and fake PDFs', () => {
  const f = (name, mime, body) => ({ originalname: name, mimetype: mime, buffer: Buffer.from(body) });
  assert.equal(validateUpload(f('a.exe', 'application/octet-stream', 'x')).ok, false);
  assert.equal(validateUpload(f('a.png', 'image/png', 'x')).ok, false);
  assert.equal(validateUpload(f('a.pdf', 'text/plain', '%PDF-1.4')).ok, false);
  assert.equal(validateUpload(f('a.pdf', 'application/pdf', 'not a pdf')).ok, false);
  assert.equal(validateUpload(f('a.pdf', 'application/pdf', '%PDF-1.4 ...')).ok, true);
  assert.equal(validateUpload(f('a.txt', 'text/plain', 'hello')).ok, true);
});

test('projectMissing lists required fields', () => {
  const m = projectMissing({ description: '', declaredValue: null, quantity: 5, weightKg: null, materials: [], ingredients: [], packaging: {} });
  assert.deepEqual(m.required.map((x) => x.field), ['description', 'declaredValue', 'weightKg']);
});

test('sanitize strips operator and dotted keys', () => {
  assert.deepEqual(clean({ a: 1, $ne: 2, 'b.c': 3, n: { $gt: 1, ok: true } }), { a: 1, n: { ok: true } });
});
