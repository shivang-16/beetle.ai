// webhooks/github.webhooks.ts
import { Webhooks } from '@octokit/webhooks';

import { env } from '../config/env.js';
import { commentOnIssueOpened, create_github_installation, delete_github_installation } from '../queries/github.queries.js';
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
      
      await create_github_installation({
        installationId: payload.installation.id,
        account: {
          login: accountLogin,
          id: account.id,
          type: accountType,
          avatarUrl: account.avatar_url,
          htmlUrl: account.html_url
        },
        sender: {
          login: payload.sender.login,
          id: payload.sender.id,
          type: payload.sender.type,
          avatarUrl: payload.sender.avatar_url,
          htmlUrl: payload.sender.html_url
        },
        targetType: accountType,
        repositorySelection: payload.installation.repository_selection,
        repositories: payload.repositories?.map(repo => ({
          id: repo.id,
          fullName: repo.full_name,
          private: repo.private
        })),
        permissions: payload.installation.permissions,
        events: payload.installation.events,
        installedAt: new Date()
      })
      
      console.log('Installation created');
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
      await delete_github_installation(payload.installation.id);
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

  // Handle issues opened events
  webhooks.on('issues.opened', async ({ payload }) => {
    console.log('issues.opened', payload);
    await commentOnIssueOpened(payload);
  });
  
  // Log all webhook events
  webhooks.onAny(({ name, payload }) => {
    console.log(`Webhook event received: ${name}`);
  });