import { Request, Response, NextFunction } from 'express';
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import { logger } from '../utils/logger.js';
import { CustomError } from '../middlewares/error.js';

/**
 * Handle GitHub App installation callback (from GitHub redirect)
 * This endpoint receives the installation_id from GitHub and redirects to frontend
 * The frontend will then call linkInstallation API with the installation_id
 */
export const handleInstallationCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { installation_id, setup_action } = req.query;

    if (!installation_id) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=missing_installation_id`);
    }

    logger.info('GitHub installation callback received, redirecting to frontend', {
      installationId: installation_id,
      setupAction: setup_action
    });

    // Redirect to frontend with installation_id
    // Frontend will be authenticated and can call the link API
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?installation_id=${installation_id}&setup_action=${setup_action}`);
  } catch (error) {
    logger.error('Error in installation callback', {
      error: error instanceof Error ? error.message : error
    });
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=callback_failed`);
  }
};

/**
 * Link a GitHub installation to the authenticated user
 * Called from the frontend after user is redirected from GitHub
 */
export const linkInstallationToUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { installation_id } = req.body;
    const userId = req.user?._id;
    const teamId = req.team?.id;

    console.log('--- LINKING DEBUG ---');
    console.log('Body:', req.body);
    console.log('User object present:', !!req.user);
    if (req.user) {
      console.log('User details:', {
        _id: req.user._id,
        id: req.user.id,
        username: req.user.username,
        type: typeof req.user._id
      });
    }
    console.log('Team object present:', !!req.team);
    console.log('---------------------');

    if (!userId) {
      return next(new CustomError("Unauthorized", 401));
    }

    if (!installation_id) {
      return next(new CustomError("Missing installation_id", 400));
    }

    logger.info('Linking GitHub installation to user', {
      installationId: installation_id,
      userId,
      teamId
    });

    // Find the installation that was created by the webhook
    const installation = await Github_Installation.findOne({ 
      installationId: Number(installation_id) 
    });

    if (!installation) {
      logger.warn('Installation not found', { installationId: installation_id });
      return next(new CustomError("Installation not found", 404));
    }

    // Update the installation with the authenticated user's info
    installation.userId = userId.toString();
    installation.teamId = teamId;
    await installation.save();

    // Also update all repositories associated with this installation
    await Github_Repository.updateMany(
      { github_installationId: installation._id },
      { 
        $set: { 
          teamId: teamId,
          userId: userId.toString()
        } 
      }
    );

    logger.info('Installation and repositories linked to user', {
      installationId: installation_id,
      userId,
      teamId
    });

    return res.json({
      success: true,
      message: 'Installation linked successfully'
    });
  } catch (error) {
    logger.error('Error linking installation to user', {
      error: error instanceof Error ? error.message : error
    });
    return next(new CustomError("Failed to link installation", 500));
  }
};
