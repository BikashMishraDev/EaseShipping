import { Router } from 'express';
import { checklistController } from '../controllers/checklist.js';

export const projectChecklist = Router({ mergeParams: true });
export const checklist = Router();

projectChecklist.get('/', checklistController.getCheckList);
checklist.patch('/:itemId', checklistController.patchItems);
