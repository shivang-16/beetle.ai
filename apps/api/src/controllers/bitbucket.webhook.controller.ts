// apps/api/src/controllers/bitbucket.webhook.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { Bitbucket_Workspace } from '../models/bitbucket_workspace.model.js';
import crypto from 'crypto';
import { BitbucketPrData } from '../queries/bitbucket.queries.js';

/**
 * Verify Bitbucket webhook signature
 * Bitbucket sends X-Hub-Signature header with HMAC-SHA256 signature
 */
export function verifyBitbucketSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = 'sha256=' + hmac.digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Error verifying Bitbucket webhook signature', { error });
    return false;
  }
}

/**
 * Handle incoming Bitbucket webhooks
 * This endpoint receives events from workspace-level webhooks
 */

// In-memory cache for webhook deduplication (use Redis in production)
const processedWebhooks = new Map<string, number>();
const WEBHOOK_CACHE_TTL = 60000; // 1 minute

export const handleBitbucketWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-hub-signature'] as string;
    const eventType = req.headers['x-event-key'] as string;
    const prId = req.body?.pullrequest?.id;
    const webhookUuid = `${prId}-${eventType}`;
    
    // Deduplicate webhooks
    const now = Date.now();
    const lastProcessed = processedWebhooks.get(webhookUuid);
    
    if (lastProcessed && (now - lastProcessed) < WEBHOOK_CACHE_TTL) {
      logger.debug('Duplicate webhook, skipping', { webhookUuid, eventType });
      return res.status(200).json({ success: true });
    }
    
    processedWebhooks.set(webhookUuid, now);
    
    logger.info('Processing Bitbucket webhook', { 
      eventType,
      prId,
      hasSignature: !!signature
    });

    // Verify signature if present
    if (signature) {
      const payload = JSON.stringify(req.body);
      
      // Find workspace by checking all workspaces (we'll optimize this later)
      // In production, you might want to include workspace slug in webhook URL
      const workspaces = await Bitbucket_Workspace.find({ 
        webhookSecret: { $exists: true, $ne: null } 
      });
      
      let verified = false;
      let matchedWorkspace = null;
      
      for (const workspace of workspaces) {
        if (workspace.webhookSecret && 
            verifyBitbucketSignature(payload, signature, workspace.webhookSecret)) {
          verified = true;
          matchedWorkspace = workspace;
          break;
        }
      }
      
      if (!verified) {
        logger.warn('Invalid webhook signature - processing anyway for debugging', { 
          eventType,
          signature: signature.substring(0, 20) + '...',
          workspaceCount: workspaces.length
        });
        // TODO: Re-enable strict signature verification in production
        // return res.status(401).json({ 
        //   success: false, 
        //   error: 'Invalid signature' 
        // });
      } else {
        logger.info('Webhook signature verified', { 
          workspaceSlug: matchedWorkspace?.workspaceSlug 
        });
      }
    } else {
      logger.warn('No webhook signature provided', { eventType });
    }

    // Process different event types
    switch (eventType) {
      case 'pullrequest:created':
        await handlePullRequestCreated(req.body);
        break;
        
      case 'pullrequest:updated':
        await handlePullRequestUpdated(req.body);
        break;
        
      case 'pullrequest:fulfilled':
        await handlePullRequestMerged(req.body);
        break;
        
      case 'pullrequest:approved':
        await handlePullRequestApproved(req.body);
        break;
        
      case 'pullrequest:comment_created':
        await handlePullRequestCommentCreated(req.body);
        break;
        
      default:
        logger.debug('Unhandled Bitbucket webhook event', { eventType });
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling Bitbucket webhook', { 
      error: error instanceof Error ? error.message : error 
    });
    
    // Still return 200 to prevent Bitbucket from retrying
    res.status(200).json({ success: false });
  }
};

/**
 * Handle pullrequest:created event
 */
async function handlePullRequestCreated(payload: any) {
  try {
    const pr = payload.pullrequest;
    const repository = payload.repository;
    
    logger.info('Processing PR created event', {
      prId: pr.id,
      prTitle: pr.title,
      repoFullName: repository.full_name
    });
    

    // Process PR data (same as GitHub)
    await BitbucketPrData(payload);
    
  } catch (error) {
    logger.error('Error handling PR created event', { error });
  }
}

/**
 * Handle pullrequest:updated event
 */
async function handlePullRequestUpdated(payload: any) {
  try {
    const pr = payload.pullrequest;
    const repository = payload.repository;
    
    logger.info('Processing PR updated event', {
      prId: pr.id,
      prTitle: pr.title,
      repoFullName: repository.full_name
    });
    
    // Import BitbucketPrData dynamically
    const { BitbucketPrData } = await import('../queries/bitbucket.queries.js');
    
    // Re-analyze PR with new changes
    await BitbucketPrData(payload);
    
  } catch (error) {
    logger.error('Error handling PR updated event', { error });
  }
}

/**
 * Handle pullrequest:fulfilled (merged) event
 */
async function handlePullRequestMerged(payload: any) {
  try {
    const pr = payload.pullrequest;
    const repository = payload.repository;
    
    logger.info('Processing PR merged event', {
      prId: pr.id,
      prTitle: pr.title,
      repoFullName: repository.full_name
    });
    
    // TODO: Update PR status in database
    
  } catch (error) {
    logger.error('Error handling PR merged event', { error });
  }
}

/**
 * Handle pullrequest:approved event
 */
async function handlePullRequestApproved(payload: any) {
  try {
    const pr = payload.pullrequest;
    const repository = payload.repository;
    
    logger.info('Processing PR approved event', {
      prId: pr.id,
      prTitle: pr.title,
      repoFullName: repository.full_name
    });
    
    // TODO: Update PR approval status
    
  } catch (error) {
    logger.error('Error handling PR approved event', { error });
  }
}

/**
 * Handle pullrequest:comment_created event
 */
async function handlePullRequestCommentCreated(payload: any) {
  try {
    const pr = payload.pullrequest;
    const comment = payload.comment;
    const repository = payload.repository;
    
    logger.info('Processing PR comment created event', {
      prId: pr.id,
      commentId: comment.id,
      repoFullName: repository.full_name
    });
    
    // Check if comment mentions @beetle or similar
    const commentText = comment.content?.raw || '';
    if (commentText.includes('@beetle')) {
      logger.info('Beetle mentioned in PR comment', {
        prId: pr.id,
        commentText
      });
      
      // TODO: Trigger analysis or respond to comment
    }
    
  } catch (error) {
    logger.error('Error handling PR comment created event', { error });
  }
}
