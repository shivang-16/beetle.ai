import { NextFunction, Request, Response } from "express";
import { Github_Installation } from "../models/github_installations.model.js";
import { Bitbucket_Workspace } from "../models/bitbucket_workspace.model.js";
import { logger } from "../utils/logger.js";
import { CustomError } from "../middlewares/error.js";
import { syncGithubRepositories } from "./github.controller.js";
import { syncBitbucketRepositories } from "./bitbucket.oauth.controller.js";
import { getBitbucketAccessToken } from "../utils/bitbucketTokenManager.js";

export const getTeamIntegrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.team?.id;
    
    if (!userId) {
      return next(new CustomError("Unauthorized", 401));
    }

    if (!teamId) {
      return next(new CustomError("Team context required", 400));
    }

    logger.debug("Fetching team integrations", { teamId, userId });

    // Fetch integrations in parallel
    const [githubInstallations, bitbucketWorkspaces] = await Promise.all([
      Github_Installation.find({ teamId }).sort({ createdAt: -1 }),
      Bitbucket_Workspace.find({ teamId }).sort({ createdAt: -1 })
    ]);

    const githubConnected = githubInstallations.some(i => i.status === 'connected');
    const bitbucketConnected = bitbucketWorkspaces.some(i => i.status === 'connected');

    const integrations = [
      {
        id: "github",
        name: "GitHub",
        description: "Connect to your GitHub repositories and organizations.",
        status: githubConnected ? 'connected' : 'disconnected',
        url: `https://github.com/apps/${process.env.GITHUB_APP_NAME || "beetle-ai"}/installations/select_target`,
        installations: githubInstallations.map(inst => ({
          installationId: inst.installationId,
          login: inst.account?.login || 'Unknown',
          avatarUrl: inst.account?.avatarUrl || null,
          type: inst.account?.type || 'Organization',
          displayName: inst.account?.login || 'Unknown',
          status: inst.status || 'connected'
        })),
        count: githubConnected ? githubInstallations.filter(i => i.status === 'connected').length : 0
      },
      {
        id: "bitbucket",
        name: "Bitbucket",
        description: "Connect to your Bitbucket workspaces.",
        status: bitbucketConnected ? 'connected' : 'disconnected',
        url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/bitbucket/oauth/connect?userId=${userId}`,
        installations: bitbucketWorkspaces.map(workspace => ({
          workspaceSlug: workspace.workspaceSlug,
          login: workspace.workspaceSlug,
          avatarUrl: workspace.account?.avatarUrl || null,
          displayName: workspace.account?.displayName || workspace.workspaceSlug,
          type: 'workspace',
          status: workspace.status || 'connected'
        })),
        count: bitbucketConnected ? bitbucketWorkspaces.filter(i => i.status === 'connected').length : 0
      }
    ];

    logger.info("Team integrations fetched", { 
      teamId, 
      githubCount: githubInstallations.length,
      bitbucketCount: bitbucketWorkspaces.length
    });

    res.json({
      success: true,
      data: integrations,
      hasAnyIntegration: githubInstallations.length > 0 || bitbucketWorkspaces.length > 0
    });
  } catch (error) {
    logger.error("Error fetching team integrations", { error });
    next(new CustomError("Failed to fetch team integrations", 500));
  }
};


/**
 * Disconnect a specific installation item
 */
export const disconnectInstallation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.team?.id;
    const { type, id } = req.body; // type: 'github' | 'bitbucket', id: installationId | workspaceSlug

    if (!userId || !teamId) {
      return next(new CustomError("Unauthorized or Team context missing", 401));
    }

    if (type === 'github') {
      await Github_Installation.updateMany(
        { teamId, installationId: id },
        { status: 'disconnected' }
      );
    } else if (type === 'bitbucket') {
      await Bitbucket_Workspace.updateMany(
        { teamId, workspaceSlug: id },
        { status: 'disconnected' }
      );
    } else {
      return next(new CustomError("Invalid integration type", 400));
    }

    logger.info("Installation disconnected", { teamId, type, id });

    res.json({
      success: true,
      message: `${type} installation disconnected successfully`
    });
  } catch (error) {
    logger.error("Error disconnecting installation", { error });
    next(new CustomError("Failed to disconnect installation", 500));
  }
};

/**
 * Check and Reconnect Integrations
 * If disconnected integrations exist, restore them.
 * Else return instruction to redirect.
 */
export const reconnectIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.team?.id;
    const { type } = req.body; // 'github' | 'bitbucket'

    if (!userId || !teamId) {
      return next(new CustomError("Unauthorized", 401));
    }

    let restoredCount = 0;
    let redirectUrl = '';

    if (type === 'github') {
      // Check for disconnected installations
      const disconnected = await Github_Installation.find({ teamId, status: 'disconnected' });
      
      if (disconnected.length > 0) {
        // Restore them
        await Github_Installation.updateMany(
          { teamId, status: 'disconnected' },
          { status: 'connected' }
        );
        restoredCount = disconnected.length;

        // Trigger sync for restored GitHub installations
        await syncGithubRepositories(userId, teamId);
      } else {
        // Prepare redirect URL for new connection
        redirectUrl = `https://github.com/apps/${process.env.GITHUB_APP_NAME || "beetle-ai"}/installations/select_target`;
      }

    } else if (type === 'bitbucket') {
      const disconnected = await Bitbucket_Workspace.find({ teamId, status: 'disconnected' });
      
      if (disconnected.length > 0) {
         await Bitbucket_Workspace.updateMany(
          { teamId, status: 'disconnected' },
          { status: 'connected' }
        );
        restoredCount = disconnected.length;

        // Trigger sync for restored Bitbucket workspaces
        for (const workspace of disconnected) {
            try {
                const tokenResult = await getBitbucketAccessToken(workspace.workspaceSlug);
                if (tokenResult.success && tokenResult.accessToken) {
                    await syncBitbucketRepositories(
                        userId,
                        String(workspace._id),
                        workspace.workspaceSlug,
                        tokenResult.accessToken,
                        teamId
                    );
                }
            } catch (err) {
                logger.error("Failed to sync bitbucket workspace after reconnect", { error: err, workspace: workspace.workspaceSlug });
            }
        }
      } else {
        redirectUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/bitbucket/oauth/connect?userId=${userId}`;
      }
    } else {
       return next(new CustomError("Invalid type", 400));
    }

    res.json({
      success: true,
      restored: restoredCount > 0,
      restoredCount,
      redirectUrl
    });

  } catch (error) {
      logger.error("Error reconnecting integration", { error });
      next(new CustomError("Failed to reconnect", 500));
  }
};

/**
 * Reconnect a specific installation item
 */
export const reconnectInstallation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.team?.id;
    const { type, id } = req.body; // type: 'github' | 'bitbucket', id: installationId | workspaceSlug

    if (!userId || !teamId) {
      return next(new CustomError("Unauthorized or Team context missing", 401));
    }

    if (type === 'github') {
      await Github_Installation.updateMany(
        { teamId, installationId: id },
        { status: 'connected' }
      );
    } else if (type === 'bitbucket') {
      await Bitbucket_Workspace.updateMany(
        { teamId, workspaceSlug: id },
        { status: 'connected' }
      );
    } else {
      return next(new CustomError("Invalid integration type", 400));
    }

    logger.info("Installation reconnected", { teamId, type, id });

    res.json({
      success: true,
      message: `${type} installation reconnected successfully`
    });
  } catch (error) {
    logger.error("Error reconnecting installation", { error });
    next(new CustomError("Failed to reconnect installation", 500));
  }
};

/**
 * Disconnect a team integration (Legacy/Full Disconnect)
 * @deprecated Use disconnectInstallation for granular control
 */



/**
 * Disconnect a team integration (Legacy/Full Disconnect)
 * @deprecated Use disconnectInstallation for granular control
 */
export const disconnectIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.team?.id;
    const { id } = req.params;

    if (!userId) {
      return next(new CustomError("Unauthorized", 401));
    }

    if (!teamId) {
      return next(new CustomError("Team context required", 400));
    }

    if (id === "github") {
      await Github_Installation.updateMany({ teamId }, { status: 'disconnected' });
    } else if (id === "bitbucket") {
      await Bitbucket_Workspace.updateMany({ teamId }, { status: 'disconnected' });
    } else {
      return next(new CustomError("Invalid integration ID", 400));
    }

    logger.info("Team integration disconnected", { teamId, integration: id });

    res.json({
      success: true,
      message: `${id} disconnected successfully`
    });
  } catch (error) {
    logger.error("Error disconnecting integration", { error });
    next(new CustomError("Failed to disconnect integration", 500));
  }
};

/**
 * Sync all repositories for all connected integrations
 */
export const syncAllRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.team?.id;

    if (!userId) {
      return next(new CustomError("Unauthorized", 401));
    }

    logger.debug("Starting unified repository sync", { userId, teamId });

    // 1. Sync GitHub
    const githubStats = await syncGithubRepositories(userId, teamId);

    // 2. Sync Bitbucket
    const bitbucketWorkspaces = await Bitbucket_Workspace.find({ 
      userId, 
      status: 'connected'
    });
    
    let bitbucketUpdated = 0;
    
    for (const workspace of bitbucketWorkspaces) {
        try {
            // Get fresh token
            const tokenResult = await getBitbucketAccessToken(workspace.workspaceSlug);
            if (tokenResult.success && tokenResult.accessToken) {
                 const count = await syncBitbucketRepositories(
                    userId,
                    String(workspace._id),
                    workspace.workspaceSlug,
                    tokenResult.accessToken,
                    teamId
                );
                bitbucketUpdated += count;
            }
        } catch (e) {
            logger.error('Failed to sync bitbucket workspace during unified sync', { 
                workspace: workspace.workspaceSlug, 
                error: e instanceof Error ? e.message : e 
            });
        }
    }

    // Combine results
    const results = {
        github: githubStats,
        bitbucket: {
            updated: bitbucketUpdated
        },
        totalUpdated: githubStats.updated + githubStats.created + bitbucketUpdated,
        message: `Synced ${githubStats.totalRepositories} GitHub repos and ${bitbucketUpdated} Bitbucket repos.`
    };

    logger.info("Unified sync completed", results);

    res.json({
      success: true,
      message: results.message,
      data: results
    });

  } catch (error) {
    logger.error("Error in unified sync", { error });
    next(new CustomError("Failed to sync repositories", 500));
  }
};
