// apps/api/src/controllers/github.controller.ts
import { NextFunction, Request, Response } from 'express';
import { getInstallationOctokit } from '../lib/githubApp.js';
import { Github_Installation } from '../models/github_installations.model.js';
import { CustomError } from '../middlewares/error.js';
import User from '../models/user.model.js';

export const createGithubInstallation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { payload } = req.body;
        if (!payload) {
          return next(new CustomError("Payload is required", 400));
        }

        const installation = new Github_Installation(payload);
        await installation.save();

        await User.updateOne({ _id: req.user._id }, { $push: { github_installations: installation._id } });
        
        res.json({
            success: true,
            data: installation
        });
    } catch (error) {
        console.error('Error creating installation:', error);
        next(new CustomError('Failed to create installation', 500));
    }
}

export const listRepositories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { installationId } = req.params;
      console.log("installationId", installationId)

      if (!installationId) {
        return next(new CustomError("Installation ID is required", 400));
      }

      const octokit = getInstallationOctokit(parseInt(installationId));
      console.log("octokit", octokit)
      
      // Get all repositories for the installation
      const { data: installation } = await octokit.rest.apps.getInstallation({
        installation_id: parseInt(installationId)
      });

      // Get all repositories with app installation
      const { data: { repositories } } = await octokit.rest.apps.listReposAccessibleToInstallation();

      res.json({
        success: true,
        data: {
          installation: {
            id: installation.id,
            account: installation.account,
            repository_selection: installation.repository_selection,
            repositories: repositories
          }
        }
      });
    } catch (error: any) {
      console.error('Error listing repositories:', error);
      next(new CustomError(error.message || 'Failed to list repositories', 500));
    }
}



// Get all installations
export async function  listUserInstallations(req: Request, res: Response, next: NextFunction) {
  try {
    const installations = await Github_Installation.find({userId: req.user.id}).sort({ installedAt: -1 });
    res.json({
      status: 'success',
      count: installations.length,
      installations
    });
  } catch (error) {
    console.error('Error listing installations:', error);
    next(new CustomError('Failed to retrieve installations', 500));
  }
}

// Get a specific installation by installation ID
export async function getInstallation(req: Request, res: Response, next: NextFunction) {
  try {
    const { installationId } = req.params;
    const installation = await Github_Installation.findOne({ 
      installationId: parseInt(installationId) 
    });
    
    if (!installation) {
      return next(new CustomError('Installation not found', 404));
    }
    
    res.json({
      status: 'success',
      installation
    });
  } catch (error) {
    console.error('Error getting installation:', error);
    next(new CustomError('Failed to retrieve installation', 500));
  }
}

// Helper function to check if an installation exists (for use in other parts of the app)
export async function checkInstallationExists(installationId: number): Promise<boolean> {
  try {
    const installation = await Github_Installation.findOne({ installationId });
    return !!installation;
  } catch (error) {
    console.error('Error checking installation:', error);
    return false;
  }
} 