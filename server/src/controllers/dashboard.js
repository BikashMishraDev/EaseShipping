import { z } from 'zod';
import { ExportProject } from '../models/ExportProject.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { ChecklistItem } from '../models/ChecklistItem.js';
import { ActivityEvent } from '../models/ActivityEvent.js';
import { UploadedDocument } from '../models/UploadedDocument.js';
import { asyncHandler, parse } from '../middleware/errors.js';
import { projectMissing } from '../services/analysis/missing.js';


const getDashboard = async (req, res) => {
    const userId = req.user._id;
    const projects = await ExportProject.find({ userId, archivedAt: null });
    const names = new Map(projects.map((p) => [String(p._id), p.name]));
    const needsAttention = projects.filter((p) => p.status === 'draft' || projectMissing(p).required.length).map((p) => ({ id: p.id, name: p.name, reason: 'Missing required details' }));
    const recentReports = await AnalysisReport.find({ userId }).sort({ createdAt: -1 }).limit(5).select('projectId status createdAt corridor');
    const open = await ChecklistItem.aggregate([{ $match: { userId, status: { $ne: 'completed' } } }, { $group: { _id: '$projectId', open: { $sum: 1 } } }]);
    const events = await ActivityEvent.find({ userId }).sort({ createdAt: -1 }).limit(8);
    res.json({
      totalProjects: projects.length,
      needsAttention,
      recentReports: recentReports.filter((r) => names.has(String(r.projectId))).map((r) => ({ id: r.id, projectId: String(r.projectId), projectName: names.get(String(r.projectId)), status: r.status, createdAt: r.createdAt })),
      incompleteChecklists: open.filter((o) => names.has(String(o._id))).map((o) => ({ projectId: String(o._id), projectName: names.get(String(o._id)), open: o.open })),
      recentActivity: events.map((e) => ({ id: e.id, message: e.message, createdAt: e.createdAt })),
    });
  }

  const patchAccount = asyncHandler(async (req, res) => {
    const { name } = parse(z.object({ name: z.string().trim().min(1).max(100) }).strict(), req.body);
    req.user.name = name;
    await req.user.save();
    res.json({ ok: true, name });
  })

  const deleteAccount = asyncHandler(async (req, res, next) => {
    const q = { userId: req.user._id };
    await Promise.all([ExportProject.deleteMany(q), AnalysisReport.deleteMany(q), ChecklistItem.deleteMany(q), ActivityEvent.deleteMany(q), UploadedDocument.deleteMany(q)]);
    await req.user.deleteOne();
    req.session.destroy((e) => (e ? next(e) : (res.clearCookie('es.sid'), res.json({ ok: true }))));
  })

export const dashboardController = { 
    getDashboard,
    patchAccount,
    deleteAccount
}
