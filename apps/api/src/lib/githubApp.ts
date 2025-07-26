// apps/api/src/lib/githubApp.ts
import { App } from '@octokit/app';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { env } from '../config/env.js';

// Initialize GitHub App
export const octokitApp = new App({
  appId: env.GITHUB_APP_ID!,
  privateKey: Buffer.from(env.GITHUB_PRIVATE_KEY_BASE64, 'base64').toString('utf8'),
  webhooks: {
    secret: env.GITHUB_WEBHOOK_SECRET
  }
});

// Create authenticated Octokit instance for an installation
export const getInstallationOctokit = (installationId: number): Octokit => {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID!,
      privateKey: Buffer.from(env.GITHUB_PRIVATE_KEY_BASE64, 'base64').toString('utf8'),
      installationId
    }
  });
};