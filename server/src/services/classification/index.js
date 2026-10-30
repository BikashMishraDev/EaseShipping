import { z } from 'zod';
import { chatJson, SAFETY_PREAMBLE } from '../ai/index.js';

export const normalizeSchema = z.object({
  normalizedProduct: z.object({
    summary: z.string().max(1000),
    productType: z.string().max(200),
    materials: z.array(z.string()).default([]),
    intendedUse: z.string().nullable().optional(),
  }),
  missingInformation: z.array(z.object({ field: z.string(), whyItMatters: z.string() })).default([]),
  searchKeywords: z.array(z.string().min(2).max(60)).min(1).max(5),
});

export const classifySchema = z.object({
  classifications: z.array(z.object({
    htsno: z.string(),
    reasoning: z.string().max(1500),
    missingInfo: z.array(z.string()).default([]),
    confidence: z.enum(['low', 'medium', 'high']).nullable().optional(),
  })).max(5).default([]),
  productSpecificChecks: z.array(z.object({ title: z.string().max(200), explanation: z.string().max(800) })).max(6).default([]),
  notes: z.string().max(1000).optional(),
});

export async function normalizeProduct(project, docFields) {
  const system = `${SAFETY_PREAMBLE}
Task: normalize the product and suggest 1-5 short search keywords for the US Harmonized Tariff Schedule (e.g. "cotton t-shirt", "leather wallet"). List information that is missing and would change the tariff classification. Do not guess attributes that were not provided.
Output: {"normalizedProduct":{"summary","productType","materials":[],"intendedUse":null},"missingInformation":[{"field","whyItMatters"}],"searchKeywords":[]}`;
  const user = `<untrusted_data>\n${JSON.stringify({ project, confirmedDocumentFields: docFields })}\n</untrusted_data>`;
  return chatJson({ system, user, schema: normalizeSchema });
}

/** Candidates MUST come from retrieved HTS rows; codes outside the set are dropped. */
export async function classify(normalized, candidates) {
  const system = `${SAFETY_PREAMBLE}
Task: choose up to 3 candidate HTS classifications ONLY from the provided candidate list (copy htsno exactly). Explain the reasoning from the product's stated attributes. List missing information that could change the result. Set confidence only when justified; otherwise null. These are suggestions, not customs determinations.
Also list up to 4 product-specific compliance areas worth checking (e.g. which US agencies commonly regulate this kind of product) as short titles with plain explanations; do not state them as confirmed requirements.
Output: {"classifications":[{"htsno","reasoning","missingInfo":[],"confidence":null}],"productSpecificChecks":[{"title","explanation"}],"notes":""}`;
  const user = `<untrusted_data>\n${JSON.stringify({ product: normalized, candidates: candidates.map((c) => ({ htsno: c.htsno, description: c.description, general: c.general })) })}\n</untrusted_data>`;
  const out = await chatJson({ system, user, schema: classifySchema });
  const byCode = new Map(candidates.map((c) => [c.htsno, c]));
  const kept = [];
  let dropped = 0;
  for (const c of out.classifications) {
    const row = byCode.get(c.htsno.trim());
    if (!row) { dropped++; continue; }
    // A classification with open questions is never rated "high".
    const confidence = c.missingInfo.length && c.confidence === 'high' ? 'medium' : c.confidence ?? null;
    kept.push({ ...c, confidence, row });
  }
  return { classifications: kept, droppedUnknownCodes: dropped, productSpecificChecks: out.productSpecificChecks, notes: out.notes || '' };
}
