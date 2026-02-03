import { Router } from 'express';
import { 
  initiateOAuth,
  handleOAuthCallback,
  disconnectWorkspace,
  getWorkspaceInfo
} from '../controllers/bitbucket.oauth.controller.js';
import { handleBitbucketWebhook } from '../controllers/bitbucket.webhook.controller.js';
import { checkAuth } from '../middlewares/checkAuth.js';

const router: Router = Router();

/**
 * Webhook endpoint - NO AUTH REQUIRED
 * Bitbucket sends events here
 */
router.post('/webhook', handleBitbucketWebhook);

/**
 * Initiate OAuth flow - NO AUTH REQUIRED
 * User will be redirected here from frontend with userId
 */
router.get('/oauth/connect', initiateOAuth);

/**
 * OAuth callback route
 * Bitbucket redirects here after user authorizes
 */
router.get('/oauth/callback', handleOAuthCallback);

/**
 * Get connected workspace info
 */
router.get('/workspace', checkAuth, getWorkspaceInfo);

/**
 * Disconnect Bitbucket workspace
 */
router.delete('/workspace', checkAuth, disconnectWorkspace);

export default router;
