// apps/api/src/controllers/github.controller.ts
import { Request, Response } from 'express';
import { getInstallationOctokit } from '../lib/githubApp.js';

export const listRepositories = async (req: Request, res: Response) => {
    try {
      const { installationId } = req.params;
      console.log("installationId", installationId)

      if (!installationId) {
        return res.status(400).json({ error: 'Installation ID is required' });
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
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list repositories'
      });
    }
}