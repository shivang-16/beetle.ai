import express, { Router } from 'express';
import { authWithSubscription } from '../middlewares/checkAuth.js';
import { getAvailableModels } from '../controllers/ai_model.controller.js';

const router: Router = express.Router();

router.use(authWithSubscription);
router.get('/models', getAvailableModels);

export default router;