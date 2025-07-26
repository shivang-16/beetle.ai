// apps/api/src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createNodeMiddleware } from '@octokit/webhooks';
import errorMiddleware from './middlewares/error.js';
import { webhooks } from './webooks/github.webooks.js';
import GithubRoutes from "./routes/github.routes.js"

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors()); // Enable CORS for all routes
  
  // We need express.json() for non-webhook routes, but webhooks need raw body
  app.use((req, res, next) => {
    if (req.path === '/api/webhooks') {
      console.log("Webhook received", req.body)
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  // Root route
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      message: 'CodeTector API is running',
    });
  });

  // Apply webhook middleware
  const webhookMiddleware = createNodeMiddleware(webhooks, { path: "/api/webhooks" });
  app.use(webhookMiddleware);

  // API Routes
  app.get('/api/github', GithubRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ 
      status: 'error',
      message: 'Not Found',
      path: req.path
    });
  });


  app.use(errorMiddleware);

  return app;
}