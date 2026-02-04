/**
 * Bitbucket OAuth Controller
 * Handles custom Bitbucket OAuth flow for connecting workspaces
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { Bitbucket_Workspace } from '../models/bitbucket_workspace.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import User from '../models/user.model.js';
import crypto from 'crypto';
import { getBitbucketAccessToken } from '../utils/bitbucketTokenManager.js';

/**
 * Initiate Bitbucket OAuth flow
 * Redirects user to Bitbucket authorization page
 */
export const initiateOAuth = async (req: Request, res: Response) => {
  try {
    // Get userId from query parameter (passed from frontend)
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ 
        message: 'Missing userId parameter',
        hint: 'Pass userId as query parameter: /api/bitbucket/oauth/connect?userId=xxx'
      });
    }

    const clientId = process.env.BITBUCKET_CLIENT_ID;
    const redirectUri = process.env.BITBUCKET_OAUTH_CALLBACK_URL;

    if (!clientId || !redirectUri) {
      logger.error('Bitbucket OAuth credentials not configured');
      return res.status(500).json({ 
        message: 'Bitbucket OAuth not configured',
        hint: 'Set BITBUCKET_CLIENT_ID and BITBUCKET_OAUTH_CALLBACK_URL in .env'
      });
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session or temporary storage (you might want to use Redis)
    // For now, we'll encode userId in the state (in production, use proper session management)
    const stateData = Buffer.from(JSON.stringify({ userId, random: state })).toString('base64');

    // Required scopes for Bitbucket
    const scopes = [
      'repository',           // Read repository data
      'repository:write',     // Write to repositories (for comments)
      'pullrequest:write',    // Write to pull requests
      'webhook'               // Manage webhooks
    ].join(' ');

    // Build Bitbucket OAuth URL
    const authUrl = new URL('https://bitbucket.org/site/oauth2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', stateData);

    logger.info('Initiating Bitbucket OAuth flow', { userId });

    // Redirect to Bitbucket
    res.redirect(authUrl.toString());
  } catch (error) {
    logger.error('Error initiating Bitbucket OAuth', { 
      error: error instanceof Error ? error.message : error 
    });
    res.status(500).json({ message: 'Failed to initiate OAuth flow' });
  }
};

/**
 * Handle Bitbucket OAuth callback
 * Exchanges code for access token and saves workspace
 */
export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    // Get web app URL with fallback
    const webAppUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Check for OAuth errors
    if (oauthError) {
      logger.error('Bitbucket OAuth error', { error: oauthError });
      return res.redirect(`${webAppUrl}/integrations?bitbucket_error=${oauthError}`);
    }

    if (!code || !state) {
      logger.error('Missing code or state in OAuth callback');
      return res.redirect(`${webAppUrl}/integrations?bitbucket_error=missing_params`);
    }

    // Decode and verify state
    let stateData: { userId: string; random: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch (err) {
      logger.error('Invalid state parameter', { state });
      return res.redirect(`${webAppUrl}/integrations?bitbucket_error=invalid_state`);
    }

    const userId = stateData.userId;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      logger.error('User not found for OAuth callback', { userId });
      return res.redirect(`${webAppUrl}/integrations?bitbucket_error=user_not_found`);
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code as string);
    
    if (!tokenData) {
      return res.redirect(`${webAppUrl}/integrations?bitbucket_error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch user's workspaces from Bitbucket
    const workspaces = await fetchBitbucketWorkspaces(access_token);
    
    if (!workspaces || workspaces.length === 0) {
      logger.warn('No Bitbucket workspaces found', { userId });
      return res.redirect(`${webAppUrl}/integrations?bitbucket_error=no_workspaces`);
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    // Process ALL workspaces
    // Process ALL workspaces using Promise.allSettled to ensure partial success
    const results = await Promise.allSettled(workspaces.map(async (wsData: any) => {
      try {
        const existing = await Bitbucket_Workspace.findOne({ 
             workspaceSlug: wsData.slug 
        });

        const newStatus = existing?.status === 'connected' ? 'connected' : 'disconnected';

        let workspaceDoc;
        if (existing) {
             existing.accessToken = access_token;
             existing.refreshToken = refresh_token || '';
             existing.tokenExpiresAt = tokenExpiresAt;
             existing.userId = userId;
             existing.status = existing.status || 'disconnected'; 
             existing.updatedAt = new Date();
             workspaceDoc = await existing.save();
        } else {
             workspaceDoc = await Bitbucket_Workspace.create({
                workspaceUuid: wsData.uuid,
                workspaceSlug: wsData.slug,
                userId: userId,
                teamId: user.activeTeamId ? String(user.activeTeamId) : undefined,
                accessToken: access_token,
                refreshToken: refresh_token || '',
                tokenExpiresAt: tokenExpiresAt,
                account: {
                    displayName: wsData.name || wsData.slug,
                    uuid: wsData.uuid,
                    type: wsData.type || 'workspace',
                    avatarUrl: wsData.links?.avatar?.href,
                },
                scopes: [], 
                connectedAt: new Date(),
                status: 'disconnected' // Explicitly disconnected as requested
            });
        }

        try {
            await syncBitbucketRepositories(
                userId,
                String(workspaceDoc._id),
                workspaceDoc.workspaceSlug,
                access_token,
                user.activeTeamId ? String(user.activeTeamId) : undefined
            );
            logger.info('Bitbucket repositories synced for workspace', { 
                workspace: workspaceDoc.workspaceSlug,
                status: workspaceDoc.status
            });
        } catch (syncErr) {
            logger.error('Failed to auto-sync repositories on connect', { 
                workspace: workspaceDoc.workspaceSlug,
                error: syncErr
            });
            // Don't throw here, as we successfully saved the workspace
        }
        return workspaceDoc.workspaceSlug;
      } catch (wsError) {
        logger.error(`Failed to process workspace ${wsData.slug}`, { error: wsError });
        throw wsError; // Re-throw to mark as rejected in allSettled
      }
    }));

    // Log summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    logger.info('Bitbucket workspace processing complete', { successful, failed, total: workspaces.length });

    res.redirect(`${webAppUrl}/integrations?bitbucket_connected=true&open_bitbucket_manage=true`);
  } catch (error) {
    logger.error('Error handling Bitbucket OAuth callback', { 
      error: error instanceof Error ? error.message : error 
    });
    const webAppUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${webAppUrl}/integrations?bitbucket_error=unknown`);
  }
};

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  try {
    const clientId = process.env.BITBUCKET_CLIENT_ID;
    const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;
    const redirectUri = process.env.BITBUCKET_OAUTH_CALLBACK_URL;

    if (!clientId || !clientSecret || !redirectUri) {
      logger.error('Bitbucket OAuth credentials not configured');
      return null;
    }

    const response = await fetch('https://bitbucket.org/site/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to exchange code for token', {
        status: response.status,
        error: errorText
      });
      return null;
    }

    const data: any = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600,
    };
  } catch (error) {
    logger.error('Error exchanging code for token', { error });
    return null;
  }
}

/**
 * Fetch user's workspaces from Bitbucket API
 */
async function fetchBitbucketWorkspaces(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch('https://api.bitbucket.org/2.0/workspaces?pagelen=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      logger.error('Failed to fetch Bitbucket workspaces', { 
        status: response.status,
        statusText: response.statusText 
      });
      return [];
    }

    const data: any = await response.json();
    return data.values || [];
  } catch (error) {
    logger.error('Error fetching Bitbucket workspaces', { error });
    return [];
  }
}

/**
 * Sync repositories for a Bitbucket workspace
 */
/**
 * Sync repositories for a Bitbucket workspace
 */
export async function syncBitbucketRepositories(
  userId: string,
  workspaceId: string,
  workspaceSlug: string,
  accessToken: string,
  teamId?: string
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspaceSlug}?pagelen=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Failed to fetch Bitbucket repositories', { 
        workspaceSlug,
        status: response.status,
        error: errorBody
      });
      return 0;
    }

    const data: any = await response.json();
    let repos = data.values || [];
    
    // Handle pagination if needed (fetching all pages)
    let nextUrl = data.next;
    while (nextUrl) {
        try {
            const nextResp = await fetch(nextUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            if (nextResp.ok) {
                const nextData: any = await nextResp.json();
                repos = [...repos, ...(nextData.values || [])];
                nextUrl = nextData.next;
            } else {
                nextUrl = null;
            }
        } catch (e) {
            nextUrl = null;
        }
    }

    if (repos.length === 0) {
      logger.info('No repositories found in Bitbucket workspace', { workspaceSlug });
      return 0;
    }

    let syncedCount = 0;
    for (const repo of repos) {
      try {
        await Github_Repository.findOneAndUpdate(
          { 
            repositoryId: repo.uuid, 
            source: 'bitbucket' 
          },
          {
            source: 'bitbucket',
            github_installationId: workspaceId,
            repositoryId: repo.uuid,
            fullName: repo.full_name,
            private: repo.is_private,
            defaultBranch: repo.mainbranch?.name || 'main',
            teamId: teamId,
            trackGithubIssues: false,
            trackGithubPullRequests: true,
            // Only set defaults on insert
            $setOnInsert: {
               raiseIssues: false,
               autoFixBugs: false,
            }
          },
          { upsert: true, new: true }
        );
        syncedCount++;
      } catch (repoError) {
        logger.warn('Failed to sync Bitbucket repository', { 
          repoName: repo.full_name,
          error: repoError 
        });
      }
    }

    await Bitbucket_Workspace.findByIdAndUpdate(workspaceId, {
      lastSyncedAt: new Date()
    });

    return syncedCount;
  } catch (error) {
    logger.error('Error syncing Bitbucket repositories', { 
      error: error instanceof Error ? error.message : error,
      workspaceSlug 
    });
    return 0;
  }
}

/**
 * Manual sync endpoint
 */
export const resyncWorkspace = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const workspace = await Bitbucket_Workspace.findOne({ userId });
        if (!workspace) {
            return res.status(404).json({ message: 'No connected Bitbucket workspace found' });
        }

        if (workspace.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Forbidden: You do not own this workspace' });
        }

        const tokenResult = await getBitbucketAccessToken(workspace.workspaceSlug);
        if (!tokenResult.success || !tokenResult.accessToken) {
            return res.status(401).json({ message: 'Failed to refresh access token. Please reconnect.' });
        }

        const count = await syncBitbucketRepositories(
            userId,
            String(workspace._id),
            workspace.workspaceSlug,
            tokenResult.accessToken,
            workspace.teamId
        );

        res.json({ success: true, count, message: `Synced ${count} repositories` });
    } catch (error) {
        logger.error('Error manually syncing workspace', { error });
        res.status(500).json({ message: 'Sync failed' });
    }
};

/**
 * Create a workspace-level webhook for PR events
 */
async function createWorkspaceWebhook(
  workspaceSlug: string,
  accessToken: string,
  workspaceId: string
): Promise<{ webhookId: string; webhookSecret: string } | null> {
  try {
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const webhookUrl = process.env.BITBUCKET_WEBHOOK_URL || 
                       process.env.API_BASE_URL + '/api/bitbucket/webhook';

    logger.info('Creating Bitbucket workspace webhook', { 
      workspaceSlug,
      webhookUrl 
    });

    const response = await fetch(
      `https://api.bitbucket.org/2.0/workspaces/${workspaceSlug}/hooks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          description: 'Beetle AI - PR Analysis',
          url: webhookUrl,
          active: true,
          events: [
            'pullrequest:created',
            'pullrequest:updated',
            'pullrequest:fulfilled',
            'pullrequest:approved',
            'pullrequest:comment_created',
            'pullrequest:comment_updated',
            'repo:created',
            'repo:imported'
          ],
          secret: webhookSecret
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to create Bitbucket workspace webhook', {
        status: response.status,
        error: errorText,
        workspaceSlug
      });
      return null;
    }

    const webhookData: any = await response.json();
    const webhookId = webhookData.uuid || webhookData.id;

    logger.info('Bitbucket workspace webhook created successfully', {
      workspaceSlug,
      webhookId
    });

    await Bitbucket_Workspace.findByIdAndUpdate(workspaceId, {
      webhookId,
      webhookSecret
    });

    return { webhookId, webhookSecret };
  } catch (error) {
    logger.error('Error creating Bitbucket workspace webhook', {
      error: error instanceof Error ? error.message : error,
      workspaceSlug
    });
    return null;
  }
}

/**
 * Disconnect Bitbucket workspace
 */
export const disconnectWorkspace = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const workspace = await Bitbucket_Workspace.findOne({ userId });
    
    if (!workspace) {
      return res.status(404).json({ message: 'No Bitbucket workspace connected' });
    }

    // Delete webhook if exists
    if (workspace.webhookId && workspace.accessToken) {
      try {
        await fetch(
          `https://api.bitbucket.org/2.0/workspaces/${workspace.workspaceSlug}/hooks/${workspace.webhookId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${workspace.accessToken}`,
            }
          }
        );
        logger.info('Deleted Bitbucket webhook', { 
          workspaceSlug: workspace.workspaceSlug,
          webhookId: workspace.webhookId 
        });
      } catch (err) {
        logger.warn('Failed to delete webhook', { error: err });
      }
    }

    // Delete workspace
    await Bitbucket_Workspace.deleteOne({ _id: workspace._id });
    
    logger.info('Disconnected Bitbucket workspace', { 
      userId,
      workspaceSlug: workspace.workspaceSlug 
    });

    res.json({ 
      message: 'Bitbucket workspace disconnected successfully',
      workspaceSlug: workspace.workspaceSlug 
    });
  } catch (error) {
    logger.error('Error disconnecting Bitbucket workspace', { 
      error: error instanceof Error ? error.message : error 
    });
    res.status(500).json({ message: 'Failed to disconnect workspace' });
  }
};

/**
 * Get connected Bitbucket workspace info
 */
export const getWorkspaceInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const workspace = await Bitbucket_Workspace.findOne({ userId });
    
    if (!workspace) {
      return res.json({ connected: false });
    }

    // Count repositories
    const repoCount = await Github_Repository.countDocuments({
      source: 'bitbucket',
      github_installationId: String(workspace._id)
    });

    res.json({
      connected: true,
      workspace: {
        slug: workspace.workspaceSlug,
        displayName: workspace.account.displayName,
        avatarUrl: workspace.account.avatarUrl,
        connectedAt: workspace.connectedAt,
        lastSyncedAt: workspace.lastSyncedAt,
        repositoryCount: repoCount,
        tokenExpiresAt: workspace.tokenExpiresAt,
        hasRefreshToken: !!workspace.refreshToken
      }
    });
  } catch (error) {
    logger.error('Error fetching Bitbucket workspace info', { 
      error: error instanceof Error ? error.message : error 
    });
    res.status(500).json({ message: 'Failed to fetch workspace info' });
  }
};
