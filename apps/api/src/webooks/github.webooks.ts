// webhooks/github.webhooks.ts
import { Webhooks } from '@octokit/webhooks';
import { getInstallationOctokit } from '../lib/githubApp.js';
import { Github_Installation } from '../models/github_Installation.js';
import { env } from '../config/env.js';
  // Set up GitHub webhooks
  export const webhooks = new Webhooks({ secret: env.GITHUB_WEBHOOK_SECRET! });
  
  // Handle installation created event
  webhooks.on('installation.created', async ({ payload }) => {
    try {
      const account = payload.installation.account;
      if (!account) {
        console.error('No account information in installation payload');
        return;
      }

      console.log(payload, "here is the payload")
      
      const accountLogin = 'login' in account ? account.login : account.slug;
      const accountType = 'type' in account ? account.type : 'Organization';
      
      console.log(`App installed for account: ${accountLogin}`);
      
      // Save installation to database
      const installation = new Github_Installation({
        installationId: payload.installation.id,
        accountLogin: accountLogin,
        accountId: account.id,
        accountType: accountType as 'User' | 'Organization',
        targetType: payload.installation.target_type,
        repositorySelection: payload.installation.repository_selection,
        permissions: payload.installation.permissions,
        events: payload.installation.events,
        installedAt: new Date(payload.installation.created_at)
      });
      
      await installation.save();
      console.log(`Installation ${payload.installation.id} saved to database`);
      
      // Get authenticated Octokit instance for this installation
      const octokit = getInstallationOctokit(payload.installation.id);
      
      // Try to create a welcome issue (if they have a .github repo)
      try {
        await octokit.rest.issues.create({
          owner: accountLogin,
          repo: '.github',
          title: '🚀 Welcome to CodeTector AI!',
          body: `Thank you for installing CodeTector AI! We'll help you find and fix code issues automatically.\n\nYour installation ID is: ${payload.installation.id}`
        });
      } catch (error) {
        console.log('Could not create welcome issue (this is normal if .github repo does not exist)');
      }
    } catch (error) {
      console.error('Error handling installation.created:', error);
    }
  });
  
  // Handle installation deleted event
  webhooks.on('installation.deleted', async ({ payload }) => {
    try {
      const account = payload.installation.account;
      if (!account) {
        console.error('No account information in installation payload');
        return;
      }
      
      const accountLogin = 'login' in account ? account.login : account.slug;
      
      console.log(`App uninstalled for account: ${accountLogin}`);
      
      // Mark installation as deleted (soft delete) or remove it
      await Github_Installation.findOneAndDelete({ installationId: payload.installation.id });
      console.log(`Installation ${payload.installation.id} removed from database`);
    } catch (error) {
      console.error('Error handling installation.deleted:', error);
    }
  });
  
  // Handle push events
  webhooks.on('push', async ({ payload }) => {
    try {
      const { repository, ref, installation } = payload;
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
  
  // Log all webhook events
  webhooks.onAny(({ name, payload }) => {
    console.log(`Webhook event received: ${name}`);
  });