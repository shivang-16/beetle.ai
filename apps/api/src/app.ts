// apps/api/src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getInstallationOctokit, octokitApp } from './lib/githubApp.js';
import { listRepositories } from './controllers/github.controller.js';
import { config } from 'dotenv';
import { Webhooks } from '@octokit/webhooks';


export function createApp(): Application {
  const app = express();

  config({
    path: '../.env'
  })

  // Middleware
  app.use(cors()); // Enable CORS for all routes
  app.use(express.json());

  // Root route
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      message: 'CodeTector API is running',
      endpoints: {
        health: '/health',
        githubRepos: '/api/installations/:installationId/repos'
      }
    });
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });


  // API Routes
  app.get('/api/installations/:installationId/repos', listRepositories);

  // GitHub Webhooks
//   app.use('/api/webhooks', octokitApp.webhooks);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ 
      status: 'error',
      message: 'Not Found',
      path: req.path
    });
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  });

  return app;
}

// Event Handlers
octokitApp.webhooks.on('installation.created', async ({ payload }: any) => {
  try {
    console.log(`App installed for account: ${payload.installation.account?.login}`);
    const octokit = getInstallationOctokit(payload.installation.id);
    
    // Create a welcome issue
    await octokit.rest.issues.create({
      owner: payload.installation.account?.login,
      repo: '.github',
      title: '🚀 Welcome to CodeTector AI!',
      body: `Thank you for installing CodeTector AI! We'll help you find and fix code issues automatically.`
    });
  } catch (error) {
    console.error('Error handling installation.created:', error);
  }
});

octokitApp.webhooks.on('push', async ({ payload, octokit }) => {
  try {
    const { repository, ref } = payload;
    const [owner, repo] = repository.full_name.split('/');
    
    console.log(`Push to ${owner}/${repo} on ref ${ref}`);
    
    // Skip if push is not to main/master branch
    if (!ref.includes('refs/heads/main') && !ref.includes('refs/heads/master')) {
      return;
    }
    
    // TODO: Add code analysis logic here
    
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});