import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLandedCost } from '../src/services/landed-cost/engine.js';
import { toMinor, formatMinor, convertToUsdMinor, percentOf } from '../src/services/landed-cost/currency.js';
import { parseGeneralRate } from '../src/services/landed-cost/rates.js';

const base = { currency: 'USD', quantity: 100, productValue: '10000.00', freight: '800.00', insurance: '50.00' };

test('complete USD estimate with ad valorem duty', () => {
  const r = calculateLandedCost({ ...base, duty: { percent: '6.5', source: 'USITC' } });
  assert.equal(r.status, 'complete');
  assert.equal(r.lines.find((l) => l.key === 'duty').amount, '650.00');
  assert.equal(r.total, '11500.00');
  assert.equal(r.perUnit, '115.00');
});

test('missing duty rate yields partial, never an invented rate', () => {
  const r = calculateLandedCost({ ...base, duty: null });
  assert.equal(r.status, 'partial');
  assert.ok(r.missing.some((m) => /duty rate/i.test(m)));
  assert.equal(r.lines.find((l) => l.key === 'duty'), undefined);
  assert.equal(r.total, '10850.00');
});

test('missing freight is flagged', () => {
  const r = calculateLandedCost({ ...base, freight: null, duty: { percent: '0' } });
  assert.equal(r.status, 'partial');
  assert.ok(r.missing.includes('International freight'));
});

test('non-USD without exchange rate cannot be converted', () => {
  const r = calculateLandedCost({ ...base, currency: 'INR', duty: { percent: '5' } });
  assert.equal(r.status, 'partial');
  assert.equal(r.lines.length, 0);
  assert.ok(r.missing.some((m) => /exchange rate/i.test(m)));
});

test('INR to USD conversion and duty on converted value', () => {
  const r = calculateLandedCost({
    currency: 'INR', quantity: 10, productValue: '100000.00', freight: '5000.00', insurance: '0',
    fx: { rate: '0.012', source: 'user', date: '2026-10-27' }, duty: { percent: '10' },
  });
  assert.equal(r.lines.find((l) => l.key === 'product').amount, '1200.00');
  assert.equal(r.lines.find((l) => l.key === 'duty').amount, '120.00');
  assert.equal(r.lines.find((l) => l.key === 'freight').amount, '60.00');
});

test('rounding is half-up per line', () => {
  assert.equal(percentOf(1005n, '10'), 101n);
  assert.equal(percentOf(1004n, '10'), 100n);
  assert.equal(convertToUsdMinor(1n, 'INR', '0.5'), 1n);
});

test('zero-decimal currency (JPY)', () => {
  assert.equal(toMinor('1500', 'JPY'), 1500n);
  assert.throws(() => toMinor('1500.5', 'JPY'));
  assert.equal(convertToUsdMinor(1500n, 'JPY', '0.0066'), 990n);
});

test('rejects excess precision and bad input', () => {
  assert.throws(() => toMinor('10.005', 'USD'));
  assert.throws(() => toMinor('-1', 'USD'));
  assert.throws(() => toMinor('abc', 'USD'));
});

test('formatMinor pads', () => { assert.equal(formatMinor(5n, 'USD'), '0.05'); });

test('taxes on customs value plus duty, no double counting', () => {
  const r = calculateLandedCost({ ...base, duty: { percent: '10' }, taxes: [{ label: 'Example tax', percent: '5', base: 'customs_value_plus_duty' }] });
  assert.equal(r.lines.find((l) => l.key === 'tax_0').amount, '550.00');
  assert.equal(r.total, '12400.00');
});

test('rate parsing is conservative', () => {
  assert.equal(parseGeneralRate('Free').percent, '0');
  assert.equal(parseGeneralRate('6.5%').kind, 'ad_valorem');
  assert.equal(parseGeneralRate('1.2¢/kg + 5%').kind, 'complex');
  assert.equal(parseGeneralRate('').kind, 'unavailable');
});
