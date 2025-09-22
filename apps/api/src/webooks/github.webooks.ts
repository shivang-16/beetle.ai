// webhooks/github.webhooks.ts
import { Webhooks } from '@octokit/webhooks';
import { logger } from '../utils/logger.js';

import { commentOnIssueOpened, create_github_installation, delete_github_installation, PrData } from '../queries/github.queries.js';
  // Set up GitHub webhooks
  export const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET! });
  
  // Handle installation created event
  webhooks.on('installation.created', async ({ payload }) => {
    try {
      const account = payload.installation.account;
      if (!account) {
        logger.error('No account information in installation payload');
        return;
      }

      logger.debug('Installation created webhook payload received', { 
        installationId: payload.installation.id,
        accountId: account.id 
      });
      
      const accountLogin = 'login' in account ? account.login : account.slug;
      const accountType = 'type' in account ? account.type : 'Organization';
      
      logger.info('App installed for account', { 
        accountLogin, 
        accountType, 
        installationId: payload.installation.id 
      });
      
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
      
      logger.info('Installation created successfully', { 
        installationId: payload.installation.id, 
        accountLogin 
      });
    } catch (error) {
      logger.error('Error handling installation.created', { 
        error: error instanceof Error ? error.message : error,
        installationId: payload.installation?.id 
      });
    }
  });
  
  // Handle installation deleted event
  webhooks.on('installation.deleted', async ({ payload }) => {
    try {
      const account = payload.installation.account;
      if (!account) {
        logger.error('No account information in installation payload');
        return;
      }
      
      const accountLogin = 'login' in account ? account.login : account.slug;
      
      logger.info('App uninstalled for account', { 
        accountLogin, 
        installationId: payload.installation.id 
      });
      
      // Mark installation as deleted (soft delete) or remove it
      await delete_github_installation(payload.installation.id);
      logger.info('Installation removed from database', { 
        installationId: payload.installation.id, 
        accountLogin 
      });
    } catch (error) {
      logger.error('Error handling installation.deleted', { 
        error: error instanceof Error ? error.message : error,
        installationId: payload.installation?.id 
      });
    }
  });
  
  // Handle push events
  webhooks.on('push', async ({ payload }) => {
    try {
      const { repository, ref, installation } = payload;
      const [owner, repo] = repository.full_name.split('/');
      
      logger.debug('Push event received', { 
        repository: repository.full_name, 
        ref, 
        installationId: installation?.id 
      });
      
      // Skip if push is not to main/master branch
      if (!ref.includes('refs/heads/main') && !ref.includes('refs/heads/master')) {
        return;
      }
      
      // TODO: Add code analysis logic here
      
    } catch (error) {
      logger.error('Error handling push event', { 
        error: error instanceof Error ? error.message : error 
      });
    }
  });

  // Handle issues opened events
  webhooks.on('issues.opened', async ({ payload }) => {
    logger.debug('Issues opened event received', { 
      issueNumber: payload.issue?.number, 
      repository: payload.repository?.full_name 
    });
    await commentOnIssueOpened(payload);
  });

  // Handle pull request opened and reopened events
  const handlePullRequestAnalysis = async ({ payload }: { payload: any }) => {
    logger.info('PR analysis triggered', { 
      action: payload.action, 
      prNumber: payload.pull_request?.number, 
      repository: payload.repository?.full_name 
    });
    const prData = await PrData(payload)
  };

  webhooks.on('pull_request.opened', handlePullRequestAnalysis);
  webhooks.on('pull_request.reopened', handlePullRequestAnalysis);
  
  // Log all webhook events
  webhooks.onAny(({ name, payload }) => {
    logger.debug('Webhook event received', { eventName: name });
  });