import { z } from 'zod';
import { ExportProject } from '../models/ExportProject.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { UploadedDocument } from '../models/UploadedDocument.js';
import { ChecklistItem } from '../models/ChecklistItem.js';
import { logActivity } from '../models/ActivityEvent.js';
import { asyncHandler, HttpError, oid, parse } from '../middleware/errors.js';
import { projectMissing } from '../services/analysis/missing.js';
import { costInputsSchema, estimateForProject } from '../services/landed-cost/build.js';


const money = z.string().trim().regex(/^\d{1,12}(\.\d{1,4})?$/, 'Use a plain number like 1250.50');
const list = z.array(z.string().trim().min(1).max(80)).max(30);
const country = z.string().trim().length(2).transform((s) => s.toUpperCase());

const base = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000),
  category: z.string().trim().max(120),
  materials: list, ingredients: list,
  originCountry: country, destinationCountry: country,
  declaredValue: money.nullable(),
  currency: z.string().trim().length(3).transform((s) => s.toUpperCase()),
  quantity: z.number().int().positive().max(1e9).nullable(),
  weightKg: z.number().positive().max(1e6).nullable(),
  packaging: z.object({ type: z.string().trim().max(120), notes: z.string().trim().max(1000) }).partial(),
});
const createSchema = base.partial().required({ name: true }).strict();
const updateSchema = base.partial().strict();

const refreshStatus = (p, hasReport) => { p.status = projectMissing(p).required.length ? 'draft' : hasReport ? 'analyzed' : 'ready'; };
const view = (p) => ({ ...p.toObject(), missing: projectMissing(p) });

async function owned(req) {
  const p = await ExportProject.findOne({ _id: oid(req.params.id), userId: req.user._id });
  if (!p) throw new HttpError(404, 'Project not found');
  return p;
}
export { owned };

const postProject = asyncHandler(async (req, res) => {
    const data = parse(createSchema, req.body);
    const p = new ExportProject({ ...data, userId: req.user._id });
    refreshStatus(p, false);
    await p.save();
    await logActivity(req.user._id, p._id, 'project_created', `Created project "${p.name}"`);
    res.status(201).json({ project: view(p) });
  })

const getAllProject = asyncHandler(async (req, res) => {
    const archived = req.query.archived === 'true';
    const items = await ExportProject.find({ userId: req.user._id, archivedAt: archived ? { $ne: null } : null }).sort({ updatedAt: -1 }).limit(200);
    res.json({ projects: items.map(view) });
  })

const getProjectByID = asyncHandler(async (req, res) => res.json({ project: view(await owned(req)) }))

const patchProjectByID = asyncHandler(async (req, res) => {
    const p = await owned(req);
    p.set(parse(updateSchema, req.body));
    const hasReport = (await AnalysisReport.countDocuments({ projectId: p._id, userId: req.user._id })) > 0;
    refreshStatus(p, hasReport);
    await p.save();
    await logActivity(req.user._id, p._id, 'project_updated', `Updated project "${p.name}"`);
    res.json({ project: view(p) });
  })

const archiveProject = asyncHandler(async (req, res) => {
    const p = await owned(req);
    const { archived } = parse(z.object({ archived: z.boolean() }), req.body);
    p.archivedAt = archived ? new Date() : null;
    await p.save();
    await logActivity(req.user._id, p._id, archived ? 'project_archived' : 'project_restored', `${archived ? 'Archived' : 'Restored'} project "${p.name}"`);
    res.json({ project: view(p) });
  })

const deleteProjectByID = asyncHandler(async (req, res) => {
    const p = await owned(req);
    const q = { projectId: p._id, userId: req.user._id };
    await Promise.all([UploadedDocument.deleteMany(q), AnalysisReport.deleteMany(q), ChecklistItem.deleteMany(q)]);
    await p.deleteOne();
    await logActivity(req.user._id, null, 'project_deleted', `Deleted project "${p.name}"`);
    res.json({ ok: true });
  })

// ---- Landed cost ----
async function latestReport(project, userId) {
    return AnalysisReport.findOne({ projectId: project._id, userId }).sort({ createdAt: -1 });
  }
  const selectedOf = (report) => report?.classifications?.find((c) => c.selected) || null;

const getProjectCostByID = asyncHandler(async (req, res) => {
    const p = await owned(req);
    const report = await latestReport(p, req.user._id);
    const sel = selectedOf(report);
    res.json({ inputs: p.costInputs || {}, selectedClassification: sel ? { htsno: sel.htsno, generalRate: sel.generalRate } : null, estimate: estimateForProject(p, sel) });
  })

const putProjectCostByID = asyncHandler(async (req, res) => {
    const p = await owned(req);
    p.costInputs = parse(costInputsSchema, req.body);
    p.markModified('costInputs');
    await p.save();
    const report = await latestReport(p, req.user._id);
    const sel = selectedOf(report);
    const estimate = estimateForProject(p, sel);
    if (report) { report.cost = estimate; await report.save(); }
    await logActivity(req.user._id, p._id, 'cost_calculated', `Updated cost estimate for "${p.name}"`);
    res.json({ inputs: p.costInputs, selectedClassification: sel ? { htsno: sel.htsno, generalRate: sel.generalRate } : null, estimate });
  })

export const projectController = {
    postProject,
    getAllProject,
    getProjectByID,
    patchProjectByID,
    archiveProject,
    deleteProjectByID,
    putProjectCostByID,
    getProjectCostByID
}