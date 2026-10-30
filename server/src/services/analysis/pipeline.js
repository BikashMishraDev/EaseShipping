import { aiStatus, AIError } from '../ai/index.js';
import { projectMissing } from './missing.js';
import { CORRIDORS, corridorKey } from './checklist-base.js';
import { normalizeProduct, classify } from '../classification/index.js';
import { searchHts, SOURCE_INFO } from '../trade-research/usitc.js';
import { parseGeneralRate } from '../landed-cost/rates.js';
import { estimateForProject } from '../landed-cost/build.js';

const snapshot = (p) => ({
  name: p.name, description: p.description, category: p.category, materials: p.materials, ingredients: p.ingredients,
  originCountry: p.originCountry, destinationCountry: p.destinationCountry, declaredValue: p.declaredValue, currency: p.currency,
  quantity: p.quantity, weightKg: p.weightKg, packaging: p.packaging,
});

/** Merge confirmed document fields (user-reviewed) into a plain object; conflicts come from the documents themselves. */
function confirmedDocData(docs) {
  const fields = {}; const conflicts = [];
  for (const d of docs.filter((x) => x.confirmed)) {
    for (const [k, f] of Object.entries(d.extraction?.fields || {})) if (!(k in fields)) fields[k] = f.value;
    for (const c of d.extraction?.conflicts || []) conflicts.push({ ...c, document: d.filename });
  }
  return { fields, conflicts };
}

/**
 * Runs the staged analysis. Returns { report, checklist } plain objects (not yet saved).
 * Never fabricates: when AI or sources are unavailable the stage is recorded as such.
 */
export async function runAnalysis(project, docs) {
  const stages = [];
  const stage = (name, status, detail) => stages.push({ name, status, detail });
  const ai = aiStatus();
  const key = corridorKey(project);
  const corridor = CORRIDORS[key];
  const { required, recommended } = projectMissing(project);
  const { fields: docFields, conflicts } = confirmedDocData(docs);
  const missingInfo = [...required.map((m) => ({ field: m.field, label: m.label, severity: 'required' })), ...recommended.map((m) => ({ field: m.field, label: m.label, severity: 'recommended' }))];
  const report = {
    corridor: key, productSnapshot: snapshot(project), missingInfo, conflicts, classifications: [], findings: [], sources: [], stages,
    summary: [], nextSteps: [], ai: { provider: ai.provider, model: ai.model, used: false }, normalizedProduct: null,
  };
  let checklist = corridor ? corridor.base.map((b) => ({ key: b.key, requirement: b.requirement, explanation: b.explanation, kind: b.kind, status: 'pending', notes: '', baseNote: b.note })) : [];

  stage('Validate inputs', required.length ? 'needs_input' : 'ok', required.length ? `Missing: ${required.map((m) => m.label).join(', ')}` : 'Required product and shipment details are present.');
  stage('Review documents', docs.length ? 'ok' : 'skipped', docs.length ? `${docs.filter((d) => d.confirmed).length} of ${docs.length} document(s) confirmed; ${conflicts.length} conflict(s) found.` : 'No documents uploaded.');
  if (conflicts.length) report.nextSteps.push('Resolve the conflicts between your documents and project details before relying on this report.');

  const finish = (status) => {
    report.status = status;
    report.cost = estimateForProject(project, null);
    stage('Calculate cost', report.cost.status === 'complete' ? 'ok' : 'partial', report.cost.status === 'complete' ? 'Complete estimate.' : 'Partial estimate: ' + report.cost.missing.join('; '));
    for (const m of required) report.nextSteps.push(`Add ${m.label.toLowerCase()}.`);
    if (!report.classifications.length) report.nextSteps.push('Run the analysis again once research is available, or ask a licensed customs broker for the HTS code.');
    report.nextSteps.push('Have a licensed customs broker review this report before you ship.');
    return { report, checklist };
  };

  if (!corridor) {
    stage('Corridor support', 'unavailable', `${key} is not supported yet. Only India to United States is available.`);
    report.summary.push(`The ${key} corridor is not supported in this version, so no research was run.`);
    return finish('blocked');
  }
  if (!project.description?.trim()) {
    report.summary.push('A product description is required before research can run.');
    return finish('blocked');
  }
  if (!ai.configured) {
    stage('AI analysis', 'unavailable', 'MODEL_API_KEY is not set, so product analysis and classification were not run. No results were generated.');
    report.summary.push('AI analysis is not configured, so classification and product-specific research were skipped. The starter checklist and cost estimate are still available.');
    return finish('blocked');
  }

  try {
    const norm = await normalizeProduct(snapshot(project), docFields);
    report.ai.used = true;
    report.normalizedProduct = norm.normalizedProduct;
    for (const m of norm.missingInformation) missingInfo.push({ field: m.field, label: m.field, severity: 'affects_classification', why: m.whyItMatters });
    stage('Normalize product', 'ok', `Identified as: ${norm.normalizedProduct.productType}`);

    // Retrieve official HTS data
    const rows = new Map(); const errors = [];
    for (const kw of norm.searchKeywords) {
      try { for (const r of await searchHts(kw)) if (!rows.has(r.htsno)) rows.set(r.htsno, r); }
      catch (e) { errors.push(`${kw}: ${e.message}`); }
    }
    const candidates = [...rows.values()].slice(0, 50);
    if (!candidates.length) {
      stage('Retrieve HTS data', 'unavailable', errors.length ? `USITC lookup failed (${errors[0]}).` : 'USITC returned no matching tariff lines.');
      report.summary.push('Official tariff data could not be retrieved, so no classification was suggested. Nothing was guessed from the model\'s memory.');
      return finish('partial');
    }
    stage('Retrieve HTS data', errors.length ? 'partial' : 'ok', `${candidates.length} tariff line(s) retrieved from USITC.`);

    const result = await classify(norm.normalizedProduct, candidates);
    const retrievedAt = new Date();
    for (const c of result.classifications) {
      const id = `usitc-${c.row.htsno}`;
      report.sources.push({
        id, title: `HTSUS ${c.row.htsno}`, url: SOURCE_INFO.urlFor(c.row.htsno), authority: SOURCE_INFO.authority, retrievedAt,
        effectiveDate: null,
        excerpt: `${c.row.description} | General: ${c.row.general || 'n/a'}`,
        limitations: 'The API does not report the HTS edition or effective date; confirm on hts.usitc.gov. The code is an AI-assisted suggestion, not a CBP determination.',
      });
      report.classifications.push({
        htsno: c.row.htsno, description: c.row.description, generalRate: c.row.general, rate: parseGeneralRate(c.row.general),
        reasoning: c.reasoning, missingInfo: c.missingInfo, confidence: c.confidence, sourceIds: [id],
      });
      report.findings.push({
        claim: `General duty rate for HTS ${c.row.htsno} is "${c.row.general || 'not listed'}".`, sourceIds: [id],
        applicability: 'Base (column 1 general) rate only. Additional duties and fees are not included.',
      });
    }
    stage('Classify', result.classifications.length ? 'ok' : 'partial', result.classifications.length
      ? `${result.classifications.length} candidate(s) matched to retrieved tariff lines${result.droppedUnknownCodes ? `; ${result.droppedUnknownCodes} unverifiable code(s) discarded` : ''}.`
      : 'No candidate could be matched to the retrieved tariff lines.');

    result.productSpecificChecks.forEach((c, i) => checklist.push({
      key: `product-check-${i}`, requirement: c.title, explanation: c.explanation, kind: 'verify', status: 'pending', notes: '',
      baseNote: 'AI-suggested area to check. Not confirmed as a requirement and not verified against a live source.',
    }));
    stage('Compliance checks', 'partial', 'Starter checklist and AI-suggested checks generated. Specific agency requirements were not verified against live sources.');
    report.summary.push(`${result.classifications.length} candidate HTS classification(s) suggested from official tariff data. They need review and confirmation.`);
    report.summary.push('Compliance items are starting points. None are confirmed against live regulatory sources.');
    if (result.notes) report.summary.push(result.notes);
    return finish(result.classifications.length && !required.length ? 'complete' : 'partial');
  } catch (e) {
    const msg = e instanceof AIError ? e.message : 'Unexpected error during analysis';
    stage('AI analysis', 'failed', msg);
    report.summary.push(`The analysis stopped early: ${msg}. No fabricated results were added.`);
    return finish('failed');
  }
}

