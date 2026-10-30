
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.js';

const router = Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }));


router.get('/me', authController.getMe);
router.get('/google', authController.getGoogle);
router.get('/google/callback', authController.getGoogleCallback);
router.get('/meta', authController.getMeta);
router.get('/meta/callback', authController.getMetaCallBack);

// Local testing only: disabled unless ALLOW_DEV_LOGIN=true and NODE_ENV is not production.
router.post('/dev-login', authController.postDevLogin);
router.post('/logout', authController.postDevLogout);

export default router;
