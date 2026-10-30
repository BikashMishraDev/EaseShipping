import PDFDocument from 'pdfkit';

const DISCLAIMER = 'EaseShipping provides research assistance only. It is not a customs authority, carrier or legal advice, and its output is not a guarantee of compliance. Classifications are AI-assisted suggestions, not official determinations.';

export function renderReportPdf({ project, report, checklist }, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Export readiness report: ${project.name}` } });
  doc.pipe(stream);
  const h = (t) => { doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).fillColor('#14323a').text(t).moveDown(0.2); doc.font('Helvetica').fontSize(10).fillColor('#1b2430'); };
  const p = (t) => doc.font('Helvetica').fontSize(10).fillColor('#1b2430').text(String(t ?? ''), { lineGap: 2 });

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#14323a').text('Export readiness report');
  doc.font('Helvetica').fontSize(11).fillColor('#444').text(`${project.name}  |  ${report.corridor}  |  Status: ${report.status}`);
  doc.fontSize(9).text(`Generated ${new Date(report.createdAt).toISOString().slice(0, 10)}. DRAFT for review.`);
  doc.moveDown(0.5).fontSize(8.5).fillColor('#8a3b12').text(DISCLAIMER);

  h('Product and shipment');
  const s = report.productSnapshot || {};
  p(`Description: ${s.description || 'not provided'}`);
  p(`Category: ${s.category || 'not provided'}   Materials: ${[...(s.materials || []), ...(s.ingredients || [])].join(', ') || 'not provided'}`);
  p(`Declared value: ${s.declaredValue ? `${s.declaredValue} ${s.currency}` : 'not provided'}   Quantity: ${s.quantity ?? 'not provided'}   Weight: ${s.weightKg ? `${s.weightKg} kg` : 'not provided'}`);

  h('Summary');
  (report.summary?.length ? report.summary : ['No summary available.']).forEach((t) => p(`- ${t}`));

  h('Candidate HTS classifications');
  if (!report.classifications?.length) p('None. No classification was suggested for this report.');
  report.classifications?.forEach((c) => {
    p(`${c.htsno}${c.selected ? ' (selected)' : ''}${c.flagged ? ' (flagged)' : ''}: ${c.description}`);
    p(`General rate: ${c.generalRate || 'n/a'}   Confidence: ${c.confidence || 'not rated'}`);
    p(`Reasoning: ${c.reasoning}`);
    if (c.missingInfo?.length) p(`Could change if known: ${c.missingInfo.join('; ')}`);
    doc.moveDown(0.3);
  });

  h('Sources');
  if (!report.sources?.length) p('No sources were retrieved.');
  report.sources?.forEach((x) => p(`${x.title} - ${x.authority}. ${x.url}  Retrieved ${new Date(x.retrievedAt).toISOString().slice(0, 10)}. ${x.limitations}`));

  h(`Landed cost estimate (${report.cost?.status || 'n/a'})`);
  if (report.cost) {
    report.cost.lines?.forEach((l) => p(`${l.label}: USD ${l.amount}   (${l.basis})`));
    p(`Total in listed lines: USD ${report.cost.total}${report.cost.perUnit ? `   Per unit: USD ${report.cost.perUnit}` : ''}`);
    if (report.cost.note) p(report.cost.note);
    if (report.cost.missing?.length) p(`Missing: ${report.cost.missing.join('; ')}`);
    p(`Assumptions: ${report.cost.assumptions?.join(' ')}`);
    p(`Not included: ${report.cost.excluded?.join('; ')}`);
  }

  h('Compliance checklist');
  checklist.forEach((c) => p(`[${c.status}] ${c.requirement} (${c.kind})${c.notes ? ` - Notes: ${c.notes}` : ''}`));

  if (report.missingInfo?.length) { h('Missing information'); report.missingInfo.forEach((m) => p(`- ${m.label} (${m.severity})${m.why ? `: ${m.why}` : ''}`)); }
  if (report.conflicts?.length) { h('Conflicts'); report.conflicts.forEach((c) => p(`- ${c.label}: project "${c.projectValue}" vs ${c.document} "${c.documentValue}"`)); }
  h('Recommended next steps');
  report.nextSteps?.forEach((t) => p(`- ${t}`));
  doc.end();
}
