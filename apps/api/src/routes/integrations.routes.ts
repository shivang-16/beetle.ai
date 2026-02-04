import { Router } from 'express';
import { getTeamIntegrations, disconnectIntegration, disconnectInstallation, reconnectIntegration, reconnectInstallation, syncAllRepositories } from '../controllers/integrations.controller.js';
import { checkAuth } from '../middlewares/checkAuth.js';

const router: Router = Router();

router.get('/', checkAuth, getTeamIntegrations);
router.post('/disconnect/:id', checkAuth, disconnectIntegration);
router.post('/disconnect-item', checkAuth, disconnectInstallation);
router.post('/reconnect-item', checkAuth, reconnectInstallation);
router.post('/reconnect', checkAuth, reconnectIntegration);
router.post('/sync', checkAuth, syncAllRepositories);

export default router;
