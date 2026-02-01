import { Router } from 'express';
import { getTeamIntegrations, disconnectIntegration } from '../controllers/integrations.controller.js';
import { checkAuth } from '../middlewares/checkAuth.js';

const router: Router = Router();

router.get('/', checkAuth, getTeamIntegrations);
router.post('/disconnect/:id', checkAuth, disconnectIntegration);

export default router;
