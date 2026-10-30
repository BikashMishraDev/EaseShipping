import { Router } from 'express';
import { systemController } from '../controllers/system.js';

const router = Router();
router.get('/health', systemController.getSystemHealth);
router.get('/system/status', systemController.getSystemStatus);

export default router;
