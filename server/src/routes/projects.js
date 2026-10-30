import { Router } from 'express';
import { projectController } from '../controllers/projects.js';

const router = Router();


router.get('/', projectController.getAllProject);

router.post('/', projectController.postProject);

router.get('/:id', projectController.getProjectByID);

router.patch('/:id', projectController.patchProjectByID);

router.post('/:id/archive', projectController.archiveProject);

router.delete('/:id', projectController.deleteProjectByID);

router.get('/:id/cost', projectController.getProjectCostByID);

router.put('/:id/cost', projectController.putProjectCostByID);

export default router;
