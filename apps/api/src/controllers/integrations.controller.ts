import { NextFunction, Request, Response } from "express";
import { Github_Installation } from "../models/github_installations.model.js";
import { Bitbucket_Workspace } from "../models/bitbucket_workspace.model.js";
import { logger } from "../utils/logger.js";
import { CustomError } from "../middlewares/error.js";

/**
 * Get team integrations (GitHub and Bitbucket)
 * Returns all integrations for the current team
 */
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

    // Fetch all GitHub installations for this team
    const githubInstallations = await Github_Installation.find({ 
      teamId,
      status: 'connected' 
    }).sort({ createdAt: -1 });

    // Fetch all Bitbucket workspaces for this team
    const bitbucketWorkspaces = await Bitbucket_Workspace.find({ 
      teamId,
      status: 'connected' 
    }).sort({ createdAt: -1 });

    const integrations = [
      {
        id: "github",
        name: "GitHub",
        description: "Connect to your GitHub repositories and organizations.",
        status: githubInstallations.length > 0 ? 'connected' : 'disconnected',
        url: `https://github.com/apps/${process.env.GITHUB_APP_NAME || "beetle-ai"}/installations/select_target`,
        installations: githubInstallations.map(inst => ({
          installationId: inst.installationId,
          login: inst.account?.login || 'Unknown',
          avatarUrl: inst.account?.avatarUrl || null,
          type: inst.account?.type || 'Organization',
          displayName: inst.account?.login || 'Unknown'
        })),
        count: githubInstallations.length
      },
      {
        id: "bitbucket",
        name: "Bitbucket",
        description: "Connect to your Bitbucket workspaces.",
        status: bitbucketWorkspaces.length > 0 ? 'connected' : 'disconnected',
        url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/bitbucket/oauth/connect?userId=${userId}`,
        installations: bitbucketWorkspaces.map(workspace => ({
          workspaceSlug: workspace.workspaceSlug,
          login: workspace.workspaceSlug,
          avatarUrl: workspace.account?.avatarUrl || null,
          displayName: workspace.account?.displayName || workspace.workspaceSlug,
          type: 'workspace'
        })),
        count: bitbucketWorkspaces.length
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
 * Disconnect a team integration
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
