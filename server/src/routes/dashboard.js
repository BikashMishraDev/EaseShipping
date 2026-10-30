import { Router } from 'express';
import { dashboardController} from '../controllers/dashboard.js';

const router = Router();

router.get('/dashboard', dashboardController.getDashboard );

router.patch('/account', dashboardController.patchAccount);

router.delete('/account', dashboardController.deleteAccount);

export default router;
