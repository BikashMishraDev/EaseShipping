import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { UploadedDocument } from '../models/UploadedDocument.js';
import { ChecklistItem } from '../models/ChecklistItem.js';
import { logActivity } from '../models/ActivityEvent.js';
import { asyncHandler, HttpError, oid, parse } from '../middleware/errors.js';
import { owned } from './projects.js';
import { runAnalysis } from '../services/analysis/pipeline.js';
import { estimateForProject } from '../services/landed-cost/build.js';
import { renderReportPdf } from '../services/reporting/pdf.js';


const analysisLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, message: { error: 'Too many analysis runs. Try again later.' } });
const view = (r) => r.toObject();

async function ownedReport(req) {
  const r = await AnalysisReport.findOne({ _id: oid(req.params.reportId), userId: req.user._id });
  if (!r) throw new HttpError(404, 'Report not found');
  return r;
}

/** Upsert checklist items; items the user has edited keep their status and notes. */
async function saveChecklist(userId, projectId, items) {
  for (const it of items) {
    const explanation = it.baseNote ? `${it.explanation} (${it.baseNote})` : it.explanation;
    const existing = await ChecklistItem.findOne({ projectId, key: it.key });
    if (existing) {
      existing.requirement = it.requirement; existing.explanation = explanation; existing.kind = it.kind;
      await existing.save();
    } else {
      await ChecklistItem.create({ userId, projectId, key: it.key, requirement: it.requirement, explanation, kind: it.kind, status: 'pending' });
    }
  }
}

const getProjectReports = asyncHandler(async (req, res) => {
    const p = await owned(req);
    const items = await AnalysisReport.find({ projectId: p._id, userId: req.user._id }).sort({ createdAt: -1 }).select('status corridor createdAt summary classifications.htsno cost.status cost.total').limit(50);
    res.json({ reports: items.map(view) });
  })

const postProjectReportAnalysis = asyncHandler(async (req, res) => {
    const p = await owned(req);
    const docs = await UploadedDocument.find({ projectId: p._id, userId: req.user._id });
    const { report, checklist } = await runAnalysis(p, docs);
    const saved = await AnalysisReport.create({ ...report, userId: req.user._id, projectId: p._id });
    await saveChecklist(req.user._id, p._id, checklist);
    p.status = 'analyzed';
    await p.save();
    await logActivity(req.user._id, p._id, 'analysis_run', `Ran analysis for "${p.name}" (${saved.status})`);
    res.status(201).json({ report: view(saved) });
  })

const getReportByID = asyncHandler(async (req, res) => res.json({ report: view(await ownedReport(req)) }))

const patchReportClassificationByIDandIndex = asyncHandler(async (req, res) => {
    const r = await ownedReport(req);
    const i = Number(req.params.index);
    if (!Number.isInteger(i) || !r.classifications[i]) throw new HttpError(404, 'Classification not found');
    const body = parse(z.object({ flagged: z.boolean().optional(), selected: z.boolean().optional() }).strict(), req.body);
    if (body.flagged !== undefined) r.classifications[i].flagged = body.flagged;
    if (body.selected !== undefined) {
      r.classifications.forEach((c, idx) => { c.selected = body.selected && idx === i; });
      const p = await owned({ params: { id: String(r.projectId) }, user: req.user });
      r.cost = estimateForProject(p, body.selected ? r.classifications[i] : null);
    }
    r.markModified('classifications');
    await r.save();
    res.json({ report: view(r) });
  })

const getReportPdfByID = asyncHandler(async (req, res) => {
    const r = await ownedReport(req);
    const p = await owned({ params: { id: String(r.projectId) }, user: req.user });
    const checklist = await ChecklistItem.find({ projectId: p._id, userId: req.user._id }).sort({ createdAt: 1 });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="export-report-${r.id}.pdf"` });
    renderReportPdf({ project: p, report: r, checklist }, res);
  })

export const reportController = {
    analysisLimiter,
    getProjectReports,
    postProjectReportAnalysis,
    getReportByID,
    patchReportClassificationByIDandIndex,
    getReportPdfByID
}