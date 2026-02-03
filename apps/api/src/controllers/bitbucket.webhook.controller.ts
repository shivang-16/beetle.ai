// apps/api/src/controllers/bitbucket.webhook.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { Bitbucket_Workspace } from '../models/bitbucket_workspace.model.js';
import crypto from 'crypto';
import { 
  BitbucketPrData, 
  handleBitbucketStopAnalysis, 
  handleBitbucketPrMerged,
  handleBitbucketRepositoryCreated
} from '../queries/bitbucket.queries.js';
import { respondToBitbucketBeetleCommentReply } from '../services/analysis/commentReplyService.js';
import { getBitbucketAccessToken } from '../utils/bitbucketTokenManager.js';

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
        
      case 'repo:push':
        await detectNewCommit(req.body);
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

      case 'repo:created':
        await handleBitbucketRepositoryCreated(req.body);
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
 * Handle repo:push event (detect new commits)
 */
async function detectNewCommit(payload: any) {
  try {
    const repository = payload.repository;
    const push = payload.push;
    
    if (!push || !push.changes) return;

    logger.info('Processing repo:push event', {
      repoFullName: repository.full_name,
      changesCount: push.changes.length
    });

    const workspaceSlug = repository.workspace?.slug;
    if (!workspaceSlug) return;

    const tokenResult = await getBitbucketAccessToken(workspaceSlug);
    if (!tokenResult.success || !tokenResult.accessToken) return;

    const repoSlug = repository.full_name.split('/')[1];

    for (const change of push.changes) {
      if (change.new && change.new.type === 'branch') {
        const branchName = change.new.name;
        // Search for open PRs with this source branch
        const q = `source.branch.name="${branchName}" AND state="OPEN"`;
        const searchUrl = `https://api.bitbucket.org/2.0/repositories/${workspaceSlug}/${repoSlug}/pullrequests?q=${encodeURIComponent(q)}`;
        
        const response = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${tokenResult.accessToken}` }
        });

        if (response.ok) {
          const data: any = await response.json();
          const openPrs = data.values || [];
          
          if (openPrs.length > 0) {
            logger.info(`Found ${openPrs.length} open PRs for pushed branch ${branchName}`, {
               prIds: openPrs.map((p: any) => p.id)
            });

            for (const pr of openPrs) {
              await BitbucketPrData({
                pullrequest: pr,
                repository: repository,
                actor: payload.actor
              });
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error handling repo:push event', { error });
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
    
    await handleBitbucketPrMerged(payload);
    
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
    const workspaceSlug = repository.workspace.slug;
    const repoSlug = repository.full_name.split('/')[1];

    if (/@(beetle-ai|beetle)\s+stop\b/i.test(commentText)) {
       await handleBitbucketStopAnalysis({
           workspaceSlug,
           repoSlug,
           prId: pr.id,
           userLogin: comment.user?.nickname
       });
       return;
    } 

    if (/@(beetle-ai|beetle)(?!\s+stop\b)/i.test(commentText)) {
       logger.info('Beetle mentioned in PR comment - triggering analysis', {
         prId: pr.id,
         commentText: commentText.slice(0, 50)
       });
       
       await BitbucketPrData(payload, { skipBotCheck: true });
       return;
    }
    
    // Handle threaded replies
    if (comment.parent && comment.parent.id) {
       const tokenResult = await getBitbucketAccessToken(workspaceSlug);
       if (tokenResult.success && tokenResult.accessToken) {
            const parentResp = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspaceSlug}/${repoSlug}/pullrequests/${pr.id}/comments/${comment.parent.id}`, {
                headers: { Authorization: `Bearer ${tokenResult.accessToken}` }
            });
            if (parentResp.ok) {
                const parentData: any = await parentResp.json();
                const parentBody = parentData.content?.raw || '';
                const parentAuthor = parentData.user?.nickname || parentData.user?.display_name;

              
                const isBeetleMsg = parentBody.toLowerCase().includes('beetle') || 
                                    parentBody.includes('```suggestion') || 
                                    parentBody.includes('**File**:') || 
                                    parentBody.includes('Copy this prompt') ||
                                    parentBody.includes('Suggested Fix') ||
                                    parentBody.includes('Confidence:') || 
                                    parentBody.includes('Prompt for AI');

                // Log parent body for debugging heuristic failures
                logger.debug('Checking if parent comment is Beetle message', {
                   prId: pr.id,
                   parentCommentId: comment.parent.id, 
                   isBeetleMsg,
                   parentBodyPreview: parentBody.slice(0, 100)
                });

                const tagsBeetle = /@(beetle-ai|beetle)/i.test(commentText) || isBeetleMsg;

                if (!tagsBeetle) {
                     logger.debug('Bitbucket reply ignored (not targeting Beetle)', { 
                         prId: pr.id,
                         commentId: comment.id,
                         parentAuthor,
                         isBeetleMsg
                     });
                } else {
                     await respondToBitbucketBeetleCommentReply({
                        workspaceSlug,
                        repoSlug,
                        prId: pr.id,
                        userReplyCommentId: comment.id,
                        userReplyBody: commentText,
                        replyAuthorLogin: comment.user?.nickname,
                        parentCommentId: comment.parent.id,
                        parentCommentBody: parentBody,
                        parentPath: parentData.inline?.path,
                        parentLine: parentData.inline?.to || parentData.inline?.from 
                    });
                }
            }
       }
    }
    
  } catch (error) {
    logger.error('Error handling PR comment created event', { error });
  }
}
