import { z } from 'zod';
import { calculateLandedCost } from './engine.js';
import { parseGeneralRate } from './rates.js';
import { supportedCurrencies } from './currency.js';

const money = z.string().trim().regex(/^\d{1,12}(\.\d{1,4})?$/, 'Use a plain number like 1250.50');
const pct = z.string().trim().regex(/^\d{1,3}(\.\d{1,4})?$/, 'Use a percent like 6.5');
const label = z.string().trim().min(1).max(80);
const src = z.string().trim().max(300).optional().nullable();

export const costInputsSchema = z.object({
  freight: money.nullable().optional(),
  insurance: money.nullable().optional(),
  fx: z.object({ rate: z.string().trim().regex(/^\d+(\.\d{1,8})?$/), source: z.string().trim().min(1).max(200), date: z.string().trim().min(1).max(20) }).nullable().optional(),
  dutyOverride: z.object({ percent: pct, source: z.string().trim().min(1).max(300) }).nullable().optional(),
  additionalDuties: z.array(z.object({ label, percent: pct, source: src })).max(10).default([]),
  taxes: z.array(z.object({ label, percent: pct, base: z.enum(['customs_value', 'customs_value_plus_duty']), source: src })).max(10).default([]),
  fees: z.array(z.object({ label, amount: money })).max(10).default([]),
}).strict();

/** Build engine input from the project, saved cost inputs and the user-selected classification. */
export function estimateForProject(project, selectedClassification) {
  const ci = project.costInputs || {};
  if (!supportedCurrencies().includes(project.currency)) {
    return { status: 'partial', lines: [], total: '0.00', perUnit: null, currency: 'USD', missing: [`Unsupported currency: ${project.currency}`], assumptions: [], excluded: [], note: 'Currency not supported by the calculator.' };
  }
  let duty = null;
  if (ci.dutyOverride?.percent) duty = { percent: ci.dutyOverride.percent, source: `User-entered: ${ci.dutyOverride.source}`, label: 'Customs duty (user-entered rate)' };
  else if (selectedClassification) {
    const r = parseGeneralRate(selectedClassification.generalRate);
    if (r.kind === 'free' || r.kind === 'ad_valorem') duty = { percent: r.percent, source: `USITC HTSUS ${selectedClassification.htsno}, General rate "${r.raw}"`, label: `Customs duty (HTS ${selectedClassification.htsno}, general rate)` };
  }
  return calculateLandedCost({
    currency: project.currency,
    quantity: project.quantity,
    productValue: project.declaredValue,
    freight: ci.freight ?? null,
    insurance: ci.insurance ?? null,
    fx: ci.fx || null,
    duty,
    additionalDuties: ci.additionalDuties || [],
    taxes: ci.taxes || [],
    fees: ci.fees || [],
  });
}
