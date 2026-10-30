import { z } from 'zod';
import { ChecklistItem } from '../models/ChecklistItem.js';
import { logActivity } from '../models/ActivityEvent.js';
import { asyncHandler, HttpError, oid, parse } from '../middleware/errors.js';
import { owned } from './projects.js';

const patch = z.object({
    status: z.enum(['pending', 'completed', 'needs_review', 'unable_to_verify']).optional(),
    notes: z.string().trim().max(2000).optional(),
  }).strict();

const patchItems =  asyncHandler(async (req, res) => {
    const item = await ChecklistItem.findOne({ _id: oid(req.params.itemId), userId: req.user._id });
    if (!item) throw new HttpError(404, 'Checklist item not found');
    item.set(parse(patch, req.body));
    item.userEdited = true;
    await item.save();
    await logActivity(req.user._id, item.projectId, 'checklist_updated', `Updated checklist item "${item.requirement.slice(0, 80)}"`);
    res.json({ item });
  })

const getCheckList = asyncHandler(async (req, res) => {
    const p = await owned(req);
    res.json({ items: await ChecklistItem.find({ projectId: p._id, userId: req.user._id }).sort({ createdAt: 1 }) });
  })

  export const checklistController = {
    patchItems,
    getCheckList
  }