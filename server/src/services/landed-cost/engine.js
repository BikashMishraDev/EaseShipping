import { convertToUsdMinor, formatMinor, percentOf, toMinor } from './currency.js';

/**
 * Deterministic landed-cost estimate for imports into the US (result currency USD).
 * No LLM involvement. Missing inputs are reported, never invented.
 *
 * input: {
 *   currency, quantity,
 *   productValue, freight, insurance,         // decimal strings in `currency`; null/undefined when unknown
 *   fx: { rate, source, date } | null,        // USD per 1 unit of `currency`; required when currency != USD
 *   duty: { percent, source, label } | null,  // General duty, ad valorem percent string
 *   additionalDuties: [{ label, percent, source }],
 *   taxes: [{ label, percent, base: 'customs_value'|'customs_value_plus_duty', source }],
 *   fees: [{ label, amount }]                 // flat fees in `currency`
 * }
 */
export function calculateLandedCost(input) {
  const missing = [];
  const assumptions = [
    'Customs value is the transaction value of the goods (assumed FOB). International freight and insurance are added to landed cost but are not part of dutiable value.',
    'Each line is rounded once to the nearest cent (half away from zero); totals are sums of rounded lines.',
    'Currency conversion uses only the exchange rate you supply; no live rates are fetched.',
  ];
  const excluded = [
    'US Merchandise Processing Fee and Harbor Maintenance Fee (enter as fees if applicable)',
    'Customs broker, bond, inspection, storage and last-mile delivery charges',
    'Any additional duties (e.g. Section 232/301 or other tariff programs) unless entered above',
  ];
  const lines = [];
  const cur = input.currency;
  const fxNeeded = cur !== 'USD';
  const rate = fxNeeded && input.fx?.rate ? input.fx.rate : null;
  if (fxNeeded && !rate) missing.push('Exchange rate to USD (with source and date)');
  const canConvert = !fxNeeded || !!rate;
  const conv = (amountStr) => convertToUsdMinor(toMinor(amountStr, cur), cur, rate);

  const addLine = (key, label, amountMinor, basis, source) =>
    lines.push({ key, label, amountMinor: amountMinor.toString(), amount: formatMinor(amountMinor, 'USD'), basis, source: source || null });

  let customsValue = null;
  if (input.productValue == null) missing.push('Product value');
  else if (canConvert) {
    customsValue = conv(input.productValue);
    addLine('product', 'Product value (customs value)', customsValue, `${input.productValue} ${cur}${fxNeeded ? ` × ${rate}` : ''}`, input.fx?.source);
  }
  for (const [key, label] of [['freight', 'International freight'], ['insurance', 'Insurance']]) {
    if (input[key] == null) missing.push(label);
    else if (canConvert) addLine(key, label, conv(input[key]), `${input[key]} ${cur}`, input.fx?.source);
  }

  let dutyMinor = null;
  if (!input.duty?.percent) missing.push('Customs duty rate (no verified ad valorem rate available)');
  else if (customsValue != null) {
    dutyMinor = percentOf(customsValue, input.duty.percent);
    addLine('duty', input.duty.label || 'Customs duty', dutyMinor, `${input.duty.percent}% of customs value`, input.duty.source);
  }
  if (customsValue != null) {
    for (const [i, d] of (input.additionalDuties || []).entries())
      addLine(`additional_duty_${i}`, d.label, percentOf(customsValue, d.percent), `${d.percent}% of customs value`, d.source);
    for (const [i, t] of (input.taxes || []).entries()) {
      const plusDuty = t.base === 'customs_value_plus_duty';
      if (plusDuty && dutyMinor == null) { missing.push(`${t.label} (needs duty rate first)`); continue; }
      const base = plusDuty ? customsValue + dutyMinor : customsValue;
      addLine(`tax_${i}`, t.label, percentOf(base, t.percent), `${t.percent}% of ${plusDuty ? 'customs value + duty' : 'customs value'}`, t.source);
    }
  }
  if (canConvert) for (const [i, f] of (input.fees || []).entries()) addLine(`fee_${i}`, f.label, conv(f.amount), `${f.amount} ${cur} flat`, null);

  const total = lines.reduce((s, l) => s + BigInt(l.amountMinor), 0n);
  const qty = Number.isInteger(input.quantity) && input.quantity > 0 ? BigInt(input.quantity) : null;
  if (!qty) missing.push('Quantity');
  const perUnit = qty && lines.length ? (2n * total + qty) / (2n * qty) : null;
  const complete = missing.length === 0;
  return {
    currency: 'USD',
    status: complete ? 'complete' : 'partial',
    valuationBasis: 'Transaction value (FOB assumed)',
    lines,
    totalMinor: total.toString(),
    total: formatMinor(total, 'USD'),
    perUnit: perUnit == null ? null : formatMinor(perUnit, 'USD'),
    missing,
    assumptions,
    excluded,
    note: complete ? null : 'Partial estimate: the total only includes the lines listed and is not a complete landed cost.',
  };
}
