import { CreateInstallationInput, createInstallationSchema } from "../validations/github.validations.js";
import { Github_Installation } from "../models/github_installations.model.js";
import { CustomError } from "../middlewares/error.js";
import User from "../models/user.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import { getInstallationOctokit } from "../lib/githubApp.js";
import { join } from 'path';
import { executeAnalysis, StreamingCallbacks } from "../services/sandbox/executeAnalysis.js";
import { createParserState, parseStreamingResponse, finalizeParsing, ParserState } from "../utils/responseParser.js";
import { PRCommentService, PRCommentContext } from "../services/analysis/prCommentService.js";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { initAnalysisCommentCounter } from "../utils/analysisStreamStore.js";
import Analysis from "../models/analysis.model.js";
import SubscriptionPlan from "../models/subscription_plan.model.js";
import { FeatureAccessChecker } from "../middlewares/helpers/checkAccessService.js";
import { Sandbox } from "@e2b/code-interpreter";

export const create_github_installation = async (payload: CreateInstallationInput) => {
    try {
      const validationResult = createInstallationSchema.safeParse(payload);
             
             if (!validationResult.success) {
               const errorMessages = validationResult.error.issues.map((issue) => ({
                 message: `${issue.path.join('.')} is ${issue.message}`,
               }));
                 return new CustomError(`Validation error: ${JSON.stringify(errorMessages)}`, 400);
             }
     
             const input: CreateInstallationInput = validationResult.data;
             
             // Check if installation already exists
             const existingInstallation = await Github_Installation.findOne({ installationId: input.installationId });
             
             if (existingInstallation) {
                 logger.info('Installation already exists, updating it', { installationId: input.installationId });
                 // Update existing installation instead of erroring
                 existingInstallation.repositorySelection = input.repositorySelection;
                 existingInstallation.permissions = input.permissions;
                 existingInstallation.events = input.events;
                 existingInstallation.status = 'connected';
                 await existingInstallation.save();
                 return existingInstallation;
             }

             // DO NOT match by username - this will be set via the callback endpoint
             // Leave userId and teamId as null initially
             logger.info('Creating installation without user assignment (will be linked via callback)', {
               installationId: input.installationId,
               accountLogin: input.account.login
             });

             const installation_data = {
              installationId: input.installationId,
              userId: null, // Will be set via callback endpoint
              teamId: null, // Will be set via callback endpoint
                 account: {
                     login: input.account.login,
                     id: input.account.id,
                     type: input.account.type,
                     avatarUrl: input.account.avatarUrl,
                     htmlUrl: input.account.htmlUrl
                 },
                 sender: {
                     login: input.sender.login,
                     id: input.sender.id,
                     type: input.sender.type,
                     avatarUrl: input.sender.avatarUrl,
                     htmlUrl: input.sender.htmlUrl
                 },
                 targetType: input.targetType,
                 repositorySelection: input.repositorySelection,
                 permissions: input.permissions,
                 events: input.events,
                 installedAt: input.installedAt || new Date()
             }

             // Create new installation
             const installation = new Github_Installation(installation_data);
     
             await installation.save();
     
             // Fetch default branch information for each repository
             // Note: teamId will be null initially, will be updated when user links the installation
             if (input.repositories && input.repositories.length > 0) {
                 const octokit = await getInstallationOctokit(input.installationId);
                 
                 const repositoriesWithDefaultBranch = await Promise.all(
                     input.repositories.map(async (repo) => {
                         try {
                             // Parse owner and repo name from fullName (e.g., "owner/repo")
                             const [owner, repoName] = repo.fullName.split('/');
                             
                             // Fetch repository details to get default branch
                             const repoDetails = await octokit.repos.get({
                                 owner,
                                 repo: repoName
                             });
                             
                             return {
                                 github_installationId: installation._id,
                                 repositoryId: repo.id,
                                 fullName: repo.fullName,
                                 private: repo.private,
                                 defaultBranch: repoDetails.data.default_branch,
                                 teamId: null, // Will be updated when installation is linked to user
                                 source: 'github'
                             };
                         } catch (error) {
                             console.error(`Failed to fetch default branch for ${repo.fullName}:`, error);
                             // Fallback to 'main' if we can't fetch the default branch
                             return {
                                 github_installationId: installation._id,
                                 repositoryId: repo.id,
                                 fullName: repo.fullName,
                                 private: repo.private,
                                 defaultBranch: 'main',
                                 teamId: null,
                                 source: 'github'
                             };
                         }
                     })
                 );
                 
                 await Github_Repository.insertMany(repositoriesWithDefaultBranch);
             }

             logger.info("GitHub installation created (pending user link via callback)", { 
               installationId: input.installationId 
             });
             return installation;
    } catch (error) {
        logger.error("Error creating GitHub installation", { error: error instanceof Error ? error.message : error });
    }
}

export const delete_github_installation = async (installationId: number) => {
  try {
    const installation = await Github_Installation.findOne({ installationId });

    if (!installation) {
      throw new CustomError("Installation not found", 404);
    }

    // Step 1: Remove the installation from users' github_installations array
    await User.updateMany(
      { github_installations: installation._id },
      { $pull: { github_installations: installation._id } }
    );

    // Step 2: Delete the installation itself
    await installation.deleteOne();

    await Github_Repository.deleteMany({ github_installationId: installation._id });

    return { message: "Installation and references deleted successfully" };
  } catch (error) {
    console.error("Error deleting GitHub installation:", error);
    throw new CustomError("Failed to delete GitHub installation", 500);
  }
};

  // Helper: log issue details for tracked repositories
export const commentOnIssueOpened = async (payload: any) => {
    try {
      const repoId = payload.repository?.id;
      if (!repoId) {
        logger.warn('Missing repository id in payload for issues.opened event');
        return;
      }

      const repoDoc = await Github_Repository.findOne({ repositoryId: repoId }).lean();
      if (!repoDoc) {
        logger.warn('Repository not found in DB for issues.opened event', { repoId });
        return;
      }

      if (!repoDoc.trackGithubIssues) {
        logger.debug('GitHub issues tracking disabled for repository', { repoId, fullName: repoDoc.fullName });
        return;
      }

      const issue = payload.issue;
      const details = {
        repoId,
        fullName: payload.repository?.full_name,
        installationId: payload.installation?.id,
        issueNumber: issue?.number,
        title: issue?.title,
        author: issue?.user?.login,
        url: issue?.html_url,
        createdAt: issue?.created_at,
        bodySnippet: (issue?.body || '').slice(0, 200)
      };

      logger.info('GitHub issue opened', details);

      // Post CTA comment to the issue
      if (details.installationId && details.issueNumber && details.fullName) {
        try {
          const [owner, repo] = details.fullName.split('/');
          const octokit = getInstallationOctokit(details.installationId);

          const linkTarget = `http://localhost:3000/analysis/${encodeURIComponent(details.fullName)}?issue=${details.issueNumber}&autoStart=1`;
          const body = [
            '🚀 Analyze and fix this issue with **[beetle-ai](https://github.com/apps/beetle-ai)**.',
            '',
            `[Start now →](${linkTarget})`
          ].join('\n');

          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: details.issueNumber,
            body
          });

          logger.info('Posted CTA comment on GitHub issue', { issueNumber: details.issueNumber, fullName: details.fullName });
        } catch (postErr) {
          logger.error('Failed to post CTA comment on GitHub issue', { error: postErr instanceof Error ? postErr.message : postErr, issueNumber: details.issueNumber });
        }
      }
    } catch (err) {
      logger.error('Error processing issues.opened event', { error: err instanceof Error ? err.message : err });
    }
  }

// Handle PR merged event - update all documents with same prKey
export const handlePrMerged = async (payload: any) => {
  try {
    const { pull_request, repository } = payload;
    
    if (!pull_request?.merged || !pull_request?.merged_at) {
      logger.debug('PR closed but not merged, skipping merge update', {
        prNumber: pull_request?.number,
        repository: repository?.full_name,
        merged: pull_request?.merged
      });
      return;
    }

    const prKey = `${repository.full_name}#${pull_request.number}`;
    const mergedAt = new Date(pull_request.merged_at);

    logger.info('Updating PR data for merged PR', {
      prKey,
      mergedAt,
      repository: repository.full_name,
      prNumber: pull_request.number
    });

    const prCollection = mongoose.connection.db?.collection('pull_request_datas');
    if (!prCollection) {
      logger.error('Unable to access pull_request_datas collection');
      return;
    }

    // Update ALL documents with this prKey
    const updateResult = await prCollection.updateMany(
      { prKey },
      {
        $set: {
          state: 'merged',
          mergedAt: mergedAt,
          updatedAt: new Date()
        }
      }
    );

    logger.info('Updated PR documents with merged state', {
      prKey,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });

  } catch (error) {
    logger.error('Error handling PR merged event', {
      error: error instanceof Error ? error.message : error,
      prNumber: payload?.pull_request?.number,
      repository: payload?.repository?.full_name
    });
  }
};

/**
 * Handle repository created event
 * Adds the new repository to our database linked to the installation
 */
export const handleRepositoryCreated = async (payload: any) => {
  try {
    const { repository, installation } = payload;
    
    if (!repository || !installation) {
      logger.warn('Missing data for repository.created event');
      return;
    }

    logger.info('Processing repository created event', {
      repoFullName: repository.full_name,
      installationId: installation.id
    });

    // 1. Find the installation to get teamId
    const installationDoc = await Github_Installation.findOne({ installationId: installation.id });
    
    if (!installationDoc) {
      logger.warn('Installation not found for repository created event', { installationId: installation.id });
      // We can still create the repo logic if we want, but teamId will be missing.
      // Better to return or create with null teamId.
    }

    // 2. Check if repo already exists (idempotency)
    const existingRepo = await Github_Repository.findOne({ 
      source: 'github', 
      repositoryId: repository.id 
    });

    if (existingRepo) {
      logger.info('Repository already exists in DB, skipping create', { repoId: repository.id });
      return;
    }

    // 3. Create new Github_Repository document
    const [owner, repoName] = repository.full_name.split('/');
    
    const newRepoData: any = {
      source: 'github',
      repositoryId: repository.id,
      fullName: repository.full_name,
      private: repository.private,
      defaultBranch: repository.default_branch || 'main',
      github_installationId: installationDoc?._id, // Link to internal installation ID
      teamId: installationDoc?.teamId, // Inherit teamId from installation
      
      // Defaults from schema will apply automatically for:
      // analysisType, analysisFrequency, trackGithubPullRequests etc.
      trackGithubIssues: false, // Default
      trackGithubPullRequests: true
    };

    if (installationDoc) {
       await Github_Repository.create(newRepoData);
       logger.info('Successfully added new GitHub repository to DB', { fullName: repository.full_name });
    } else {
       logger.warn('Skipping DB insertion because installation doc was missing');
    }

  } catch (error) {
    logger.error('Error handling repository.created', { 
      error: error instanceof Error ? error.message : error 
    });
  }
};

/**
 * Handle stop analysis command from PR comment
 * Interrupts any running analyses for the specified PR
 */
export const handleStopAnalysis = async (payload: {
  repository: { full_name: string };
  installation: { id: number };
  prNumber: number;
  headSha?: string;
}) => {
  try {
    const { repository, installation, prNumber } = payload;
    const [owner, repo] = repository.full_name.split('/');

    logger.info('Processing stop analysis command', {
      repository: repository.full_name,
      prNumber,
    });

    // Find the repository to get its ID
    const githubRepo = await Github_Repository.findOne({ fullName: repository.full_name });
    
    let interruptedCount = 0;
    let killedSandboxes = 0;

    if (githubRepo) {
      // First, find all running analyses to get their sandbox IDs
      const runningAnalyses = await Analysis.find({
        github_repositoryId: githubRepo._id,
        pr_number: prNumber,
        status: 'running',
      }).select('_id sandboxId');

      // Try to kill each sandbox
      
      for (const analysis of runningAnalyses) {
        if (analysis.sandboxId) {
          try {
            logger.info('Attempting to kill sandbox', { 
              sandboxId: analysis.sandboxId, 
              analysisId: analysis._id 
            });
            await Sandbox.kill(analysis.sandboxId);
            killedSandboxes++;
            logger.info('Successfully killed sandbox', { 
              sandboxId: analysis.sandboxId 
            });
          } catch (killErr) {
            // Sandbox might already be dead or unreachable - that's okay
            logger.warn('Failed to kill sandbox (may already be stopped)', { 
              sandboxId: analysis.sandboxId,
              error: killErr instanceof Error ? killErr.message : killErr 
            });
          }
        }
      }

      // Update all running analyses to interrupted
      const result = await Analysis.updateMany(
        {
          github_repositoryId: githubRepo._id,
          pr_number: prNumber,
          status: 'running',
        },
        {
          $set: { 
            status: 'interrupted',
            errorLogs: 'Manually stopped via @beetle stop command.'
          },
        }
      );
      interruptedCount = result.modifiedCount || 0;
    }

    logger.info('Interrupted running analyses', {
      repository: repository.full_name,
      prNumber,
      interruptedCount,
      killedSandboxes,
    });

    const octokit = getInstallationOctokit(installation.id);

    // Update GitHub Check Run to cancelled status
    if (interruptedCount > 0) {
      try {
        // Find the existing Beetle check run for this PR
        const checkRuns = await octokit.checks.listForRef({
          owner,
          repo,
          ref: payload.headSha || `refs/pull/${prNumber}/head`,
          check_name: 'Beetle',
        });

        const beetleCheck = checkRuns.data.check_runs.find(
          (run) => run.status === 'in_progress' || run.status === 'queued'
        );

        if (beetleCheck) {
          await octokit.checks.update({
            owner,
            repo,
            check_run_id: beetleCheck.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
            conclusion: 'cancelled',
            output: {
              title: 'Beetle AI review cancelled',
              summary: `Analysis was stopped by user command.`,
              text: `The review was interrupted. To restart, comment \`@beetle-ai review\`.`,
            },
          });
          logger.info('Updated Beetle check run to cancelled', { checkRunId: beetleCheck.id, prNumber });
        } else {
          // Fallback to commit status if no check run found
          logger.debug('No in-progress Beetle check run found, trying commit status fallback', { prNumber });
          try {
            await octokit.repos.createCommitStatus({
              owner,
              repo,
              sha: payload.headSha || '',
              state: 'error',
              context: 'Beetle',
              description: 'Analysis cancelled by user',
              target_url: `https://beetleai.dev/github/${encodeURIComponent(repository.full_name)}/pull/${prNumber}`,
            });
          } catch (statusErr) {
            logger.warn('Failed to update commit status', { error: statusErr instanceof Error ? statusErr.message : statusErr });
          }
        }
      } catch (checkErr) {
        logger.warn('Failed to update GitHub Check Run to cancelled', {
          error: checkErr instanceof Error ? checkErr.message : checkErr,
          prNumber,
        });
      }
    }

    // Post confirmation comment
    const stopMessage = interruptedCount > 0
      ? `🛑 **Analysis stopped.** ${interruptedCount} running analysis${interruptedCount > 1 ? 'es were' : ' was'} interrupted${killedSandboxes > 0 ? ` and ${killedSandboxes} sandbox${killedSandboxes > 1 ? 'es' : ''} terminated` : ''}.\n\nTo restart analysis, comment \`@beetle-ai review\`.`
      : `ℹ️ No running analysis found for this PR.\n\nTo start a new analysis, comment \`@beetle-ai review\`.`;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: stopMessage,
    });

    return { success: true, interruptedCount, killedSandboxes };
  } catch (error) {
    logger.error('Error handling stop analysis command', {
      error: error instanceof Error ? error.message : error,
      prNumber: payload?.prNumber,
      repository: payload?.repository?.full_name,
    });
    throw error;
  }
};

// Get user's GitHub installation for token generation
export const getUserGitHubInstallation = async (userId: string, owner: string) => {
  try {
const installation = await Github_Installation.findOne({ userId, "account.login": owner })
  .sort({ _id: -1 });
    
    if (!installation) {
      throw new CustomError("No GitHub installation found for this user. Please install the GitHub App first.", 404);
    }
    
    return installation;
  } catch (error) {
    console.error("Error getting user GitHub installation:", error);
    throw new CustomError("Failed to get GitHub installation", 500);
  }
};

// Get organization installation for a specific repository
export const getOrganizationInstallationForRepo = async (owner: string, repo: string, userId: string) => {
  try {
    logger.debug("Looking for organization installation", { owner, repo, userId });
    
    // First, check if the user has access to any organization installations
    // Look for installations where the account matches the repository owner
    const orgInstallation = await Github_Installation.findOne({
      "account.login": owner,
      "account.type": "Organization"
    });

    if (!orgInstallation) {
      logger.debug("No organization installation found", { owner });
      return null;
    }

    logger.debug("Found organization installation", {
      owner,
      installationId: orgInstallation.installationId,
      account: orgInstallation.account.login,
      targetType: orgInstallation.targetType,
      userId: orgInstallation.userId
    });

    // For organization installations, we need to check if the user has access
    // This could be through:
    // 1. The user is the sender of the installation
    // 2. The user is a member of the organization
    // 3. The user has been granted access through the GitHub App
    
    // Check if the user is the sender of this installation
    if (orgInstallation.sender && orgInstallation.sender.login) {
      logger.debug("Installation sender found", { sender: orgInstallation.sender.login, owner });
      
      // If the user is the sender, they have access
      // You might want to add additional checks here based on your requirements
      return orgInstallation;
    }

    // If no sender or other access method, we'll still return the installation
    // but you might want to add more sophisticated access control
    logger.debug("No clear access control found, returning installation", { owner });
    return orgInstallation;
  } catch (error) {
    logger.error("Error getting organization installation for repo", { error: error instanceof Error ? error.message : error, owner, repo });
    return null;
  }
};

// Debug function to check all installations for a user
export const getAllUserInstallations = async (userId: string) => {
  try {
    // Get all installations where this user is the owner
    const userInstallations = await Github_Installation.find({ userId });
    
    // Get all organization installations (where userId might be null or different)
    const orgInstallations = await Github_Installation.find({
      "account.type": "Organization"
    });
    
    logger.debug("Retrieved user installations", { 
      userId, 
      userInstallationsCount: userInstallations.length,
      orgInstallationsCount: orgInstallations.length 
    });
    
    return {
      userInstallations,
      orgInstallations
    };
  } catch (error) {
    logger.error("Error getting all user installations", { error: error instanceof Error ? error.message : error, userId });
    return { userInstallations: [], orgInstallations: [] };
  }
};

// Check if installation has permission to create issues
export const checkIssueCreationPermission = (installation: any) => {
  try {
    if (!installation.permissions) {
      logger.warn("No permissions found in installation");
      return false;
    }

    // Check if the installation has permission to create issues
    // GitHub App permissions for issues: "issues": "write" or "issues": "admin"
    const issuePermission = installation.permissions.get ? 
      installation.permissions.get("issues") : 
      installation.permissions["issues"];
    
    logger.debug("Checking issue creation permission", { issuePermission });
    
    // Return true if permission is "write" or "admin"
    return issuePermission === "write" || issuePermission === "admin";
  } catch (error) {
    logger.error("Error checking issue creation permission", { error: error instanceof Error ? error.message : error });
    return false;
  }
};

// Check if installation has permission to create pull requests
export const checkPullRequestPermission = (installation: any) => {
  try {
    if (!installation.permissions) {
      logger.warn("No permissions found in installation");
      return false;
    }

    // Check if the installation has permission to create pull requests
    // GitHub App permissions for pull requests: "contents": "write" or "contents": "admin"
    const contentsPermission = installation.permissions.get ? 
      installation.permissions.get("contents") : 
      installation.permissions["contents"];
    
    logger.debug("Checking pull request permission", { contentsPermission });
    
    // Return true if permission is "write" or "admin"
    return contentsPermission === "write" || contentsPermission === "admin";
  } catch (error) {
    logger.error("Error checking pull request permission", { error: error instanceof Error ? error.message : error });
    return false;
  }
};



export const PrData = async (payload: any, options?: { skipBotCheck?: boolean }) => {
  try {
    const { pull_request, repository, installation, sender } = payload;
    const skipBotCheck = options?.skipBotCheck || false;
   
    logger.debug("Processing PR data", { 
      installationId: installation?.id, 
      repositoryName: repository?.full_name,
      prNumber: pull_request?.number,
      skipBotCheck,
    });

    // Verify installation exists and is connected
    const githubInstallation = await Github_Installation.findOne({ installationId: installation.id });
    if (!githubInstallation) {
      logger.warn('Installation not found for PR data', { installationId: installation.id });
      // Proceeding might fail later implicitly, but safer to return or let flow handle missing doc
      // Existing code fetches it later again.
    } else if (githubInstallation.status === 'disconnected') {
      logger.info('Installation is disconnected, skipping PR analysis silently', { 
        installationId: installation.id, 
        repository: repository?.full_name 
      });
      return;
    }

         // Helper function to create a skipped analysis record
    const createSkippedAnalysis = async (skipReason: string) => {
      try {
        const [githubInstallation, githubRepo] = await Promise.all([
          Github_Installation.findOne({ installationId: installation.id }),
          Github_Repository.findOne({ fullName: repository.full_name })
        ]);

        if (!githubInstallation?.userId || !githubRepo) return null;

        const repoUrl = `https://github.com/${repository.full_name}`;
        const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
        const analysisId = new mongoose.Types.ObjectId().toString();
        
        const createPayload: any = {
          _id: analysisId,
          analysis_type: "pr_analysis",
          userId: githubInstallation.userId,
          teamId: githubRepo.teamId || undefined,
          repoUrl,
          github_repositoryId: githubRepo._id,
          sandboxId: "",
          model: "skipped",
          prompt: "Skipped - " + skipReason,
          status: "skipped",
          pr_number: pull_request.number,
          pr_url: prUrl,
          pr_title: pull_request.title,
          errorLogs: skipReason,
          // Don't store reviewedLinesOfCode for skipped analyses
        };
        
        await Analysis.create(createPayload);
        logger.info("Created skipped analysis record", { 
          analysisId, 
          repo: repository.full_name, 
          prNumber: pull_request.number,
          skipReason 
        });
        return analysisId;
      } catch (err) {
        logger.warn("Failed to create skipped analysis record", { 
          error: err instanceof Error ? err.message : err 
        });
        return null;
      }
    };


    // Early check: Is PR author a bot? Skip automatic review if so.
    // Skip this check if triggered by @beetle-ai review command
    if (!skipBotCheck) {
      const prAuthorLogin = pull_request?.user?.login || '';
      const prAuthorType = pull_request?.user?.type || '';
      const isPrAuthorBot = (
        String(prAuthorType).toLowerCase() === 'bot' ||
        /\[bot\]$/i.test(prAuthorLogin) ||
        /^bot-/i.test(prAuthorLogin) || /-bot$/i.test(prAuthorLogin)
      );

      if (isPrAuthorBot) {
        logger.info("PR author is a bot; skipping automatic review", {
          author: prAuthorLogin,
          authorType: prAuthorType,
          prNumber: pull_request?.number,
          repository: repository?.full_name,
        });

        // Post a comment informing how to trigger review using PRCommentService
        const [owner, repo] = repository.full_name.split('/');
        const prCommentService = new PRCommentService({
          installationId: installation.id,
          owner,
          repo,
          pullNumber: pull_request.number,
          commitSha: pull_request.head.sha,
        });

        await prCommentService.postBotAuthorSkippedComment();

        return; // Skip automatic PR analysis for bot authors
      }
    }

    // Early check: daily PR analysis limit
    try {
      if (githubInstallation?.userId) {
        const user = await User.findById(githubInstallation.userId);
        const [owner, repo] = repository.full_name.split('/');
        let subscriptionPlan = null as any;

        if (user?.subscriptionPlanId) {
          try {
            subscriptionPlan = await SubscriptionPlan.findById(new mongoose.Types.ObjectId(user.subscriptionPlanId.toString()));
          } catch (e) {
            subscriptionPlan = null;
          }
        }
        if (!subscriptionPlan) {
          subscriptionPlan = await SubscriptionPlan.findOne({ name: 'free', isActive: true });
        }

        if (subscriptionPlan && user) {
          const sub = {
            planId: subscriptionPlan._id,
            planName: subscriptionPlan.name,
            status: user.subscriptionStatus || 'free',
            features: {
              maxTeams: subscriptionPlan.features.maxTeams,
              maxTeamMembers: subscriptionPlan.features.maxTeamMembers,
              maxPrAnalysisPerDay: (subscriptionPlan.features as any).maxPrAnalysisPerDay ?? 5,
              maxFullRepoAnalysisPerDay: (subscriptionPlan.features as any).maxFullRepoAnalysisPerDay ?? 2,
              prioritySupport: subscriptionPlan.features.prioritySupport,
              organizationSupport: (subscriptionPlan.features as any).organizationSupport ?? (subscriptionPlan.name === 'lite' || subscriptionPlan.name === 'advance'),
            },
            startDate: user.subscriptionStartDate,
            endDate: user.subscriptionEndDate,
          };

          const fakeReq: any = { sub, user: { _id: user._id } };
          const featureResult = await FeatureAccessChecker.checkFeatureAccess(fakeReq, 'maxPrAnalysisPerDay');

          if (!featureResult.allowed) {
            const prCommentService = new PRCommentService({
              installationId: installation.id,
              owner,
              repo,
              pullNumber: pull_request.number,
              commitSha: pull_request.head.sha,
            });

            await prCommentService.postDailyLimitReachedComment();

            // Create skipped analysis record for daily limit
            await createSkippedAnalysis(`Daily PR analysis limit reached. Plan: ${featureResult.planName}, Current: ${featureResult.currentCount}, Max: ${featureResult.maxAllowed}`);

            logger.info("PR analysis blocked due to daily limit", {
              userId: githubInstallation.userId,
              planName: featureResult.planName,
              currentCount: featureResult.currentCount,
              maxAllowed: featureResult.maxAllowed,
              prNumber: pull_request.number,
              repository: repository.full_name,
            });

            return; // Stop further processing when limit is reached
          }
        }
      }
    } catch (limitErr) {
      logger.warn("Failed to perform PR analysis daily limit check", { error: limitErr instanceof Error ? limitErr.message : limitErr });
      // Continue processing if check fails; do not block PR handling due to check failure
    }
    // Write full payload to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pr-llm-payload-${timestamp}.json`;
    const filepath = join(process.cwd(), 'logs', filename);
    
   
    // Get Octokit instance for additional API calls
    const octokit = getInstallationOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    // Fetch additional PR details using Octokit
    let filesChanged: any[] = [];
    let commits: any[] = [];
    let reviews: any[] = [];
    let diffContent = '';
    
    try {
      // Get files changed in the PR
      const filesResponse = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pull_request.number
      });
      
      filesChanged = filesResponse.data.map(file => ({
        filename: file.filename,
        status: file.status, // added, modified, removed, renamed
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch, // The actual diff content
        blobUrl: file.blob_url,
        rawUrl: file.raw_url,
        contentsUrl: file.contents_url,
        previousFilename: file.previous_filename // for renamed files
      }));

      
      const commitsResponse = await octokit.pulls.listCommits({
        owner,
        repo,
        pull_number: pull_request.number
      });
      
      commits = commitsResponse.data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name,
          email: commit.commit.author?.email,
          date: commit.commit.author?.date,
          login: commit.author?.login
        },
        committer: {
          name: commit.commit.committer?.name,
          email: commit.commit.committer?.email,
          date: commit.commit.committer?.date,
          login: commit.committer?.login
        },
        parents: commit.parents?.map(p => p.sha) || [],
        url: commit.html_url,
        stats: {
          additions: commit.stats?.additions,
          deletions: commit.stats?.deletions,
          total: commit.stats?.total
        },
        files: [] // Initialize empty files array - will be populated later
      }));

      // Fetch individual commit details to get files changed per commit
      for (let i = 0; i < commits.length; i++) {
        try {
          const commitDetail = await octokit.repos.getCommit({
            owner,
            repo,
            ref: commits[i].sha
          });
          
          // Update stats from individual commit details (pulls.listCommits doesn't include stats)
          commits[i].stats = {
            additions: commitDetail?.data?.stats?.additions || 0,
            deletions: commitDetail?.data?.stats?.deletions || 0,
            total: commitDetail?.data?.stats?.total || 0
          };
          
          commits[i].files = commitDetail?.data?.files?.map((file: any) => ({
            filename: file.filename,
            status: file.status, // added, modified, removed, renamed
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch, // The actual diff content for this commit
            blobUrl: file.blob_url,
            rawUrl: file.raw_url,
            contentsUrl: file.contents_url,
            previousFilename: file.previous_filename // for renamed files
          }));
        } catch (commitError) {
          console.warn(`Failed to fetch details for commit ${commits[i].sha}:`, commitError);
          // Keep empty files array if we can't fetch commit details
        }
      }
      
      // Get PR reviews
      const reviewsResponse = await octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: pull_request.number
      });
      
      reviews = reviewsResponse.data.map(review => ({
        id: review.id,
        user: {
          login: review.user?.login,
          id: review.user?.id,
          avatarUrl: review.user?.avatar_url
        },
        body: review.body,
        state: review.state, // APPROVED, CHANGES_REQUESTED, COMMENTED
        submittedAt: review.submitted_at,
        commitId: review.commit_id
      }));
      
      // Get the diff content
      const diffResponse = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pull_request.number,
        mediaType: {
          format: 'diff'
        }
      });
      
      diffContent = diffResponse.data as unknown as string;
      
    } catch (apiError) {
      console.error('Error fetching additional PR data:', apiError);
    }
    
    // Streamlined response for model analysis
    // Create a unique key per PR for deduplication and updates
    const prKey = `${repository.full_name}#${pull_request.number}`;
    const latestCommitSha = (commits[commits.length - 1]?.sha) || pull_request.head.sha;

    // Get teamId from repository
    const githubRepoForTeam = await Github_Repository.findOne({ fullName: repository.full_name });
    const teamIdForPrData = githubRepoForTeam?.teamId || undefined;

    const modelAnalysisData: any = {
      // Essential PR Information
      pr: {
        number: pull_request.number,
        title: pull_request.title,
        description: pull_request.body || '',
        state: pull_request.state,
        isDraft: pull_request.draft,
        createdAt: pull_request.created_at,
        updatedAt: pull_request.updated_at
      },
      
      // PR Author information for leaderboard
      author: {
        username: pull_request.user.login,
        name: commits.find((c: any) => c.author?.login === pull_request.user.login)?.author?.name || pull_request.user.login,
        avatar: pull_request.user.avatar_url
      },
      
      // Team ID for team-based tracking
      teamId: teamIdForPrData,
      
      // Minimal Repository Info
      repository: {
        name: repository.full_name,
        url: repository.html_url,
        defaultBranch: repository.default_branch
      },
      
      // Branch Information (useful for context)
      branches: {
        head: {
          ref: pull_request.head.ref,
          sha: pull_request.head.sha
        },
        base: {
          ref: pull_request.base.ref,
          sha: pull_request.base.sha
        }
      },
      // Unique identifiers for dedupe and tracking
      prKey,
      latestCommitSha,
      state: 'open', // Track PR state: open, closed, merged
      skipped: false,
      // Core Changes Data
      changes: {
        summary: {
          files: pull_request.changed_files,
          additions: pull_request.additions,
          deletions: pull_request.deletions,
          commits: pull_request.commits
        },
      
        commits: commits.map((commit: any) => ({
          sha: commit.sha,
          message: commit.message,
          author: commit.author.name || commit.author.login,
          date: commit.author.date,
          files: commit.files.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            patch: file.patch // The actual diff for this specific commit
          }))
        })),
        fullDiff: diffContent.slice(0, 100000) // Increased limit for comprehensive analysis
      },
      
      // PR Comments and Reviews
      feedback: {
        reviews: reviews.map((review: any) => ({
          author: review.user?.login,
          state: review.state,
          body: review.body,
          submittedAt: review.submitted_at
        })),
        commentCount: pull_request.comments,
        reviewCommentCount: pull_request.review_comments
      },
      
      // Labels for context
      labels: pull_request.labels?.map((label: any) => label.name) || [],
      
      // Analysis hints for the model
      context: {
        complexity: Math.min(100, (pull_request.changed_files * 3) + Math.floor((pull_request.additions + pull_request.deletions) / 20)),
        riskLevel: pull_request.changed_files > 15 ? 'high' : pull_request.changed_files > 8 ? 'medium' : 'low',
        hasTests: (filesChanged as any[]).some(f => f.filename.includes('test') || f.filename.includes('spec')),
        hasDocChanges: (filesChanged as any[]).some(f => f.filename.includes('README') || f.filename.includes('.md')),
        hasDependencyChanges: (filesChanged as any[]).some(f => f.filename.includes('package.json') || f.filename.includes('requirements.txt')),
        primaryLanguages: [...new Set((filesChanged as any[]).map(f => f.filename.split('.').pop()).filter(Boolean))].slice(0, 5)
      },
      createdAt: new Date(),
    };

 
    // Before inserting, check if we already have data for this PR and only insert for NEW commits
    const prCollection = mongoose.connection.db?.collection('pull_request_datas');
    const latestStored = await prCollection?.find({
      $or: [
        { prKey },
        // Fallback query for legacy entries without prKey
        { 'pr.number': pull_request.number, 'repository.name': repository.full_name }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

    const previousEntry = latestStored && latestStored[0] ? latestStored[0] : null;
    const lastStoredSha: string | undefined = previousEntry?.latestCommitSha;

    // Determine new commits by position AFTER last stored latestCommitSha
    const lastIndex = lastStoredSha ? commits.findIndex((c: any) => c.sha === lastStoredSha) : -1;
    const newCommitsOnly = lastIndex >= 0 ? commits.slice(lastIndex + 1) : commits;

    const analyzableCommits = newCommitsOnly.filter((commit: any) => {
        return !commit.parents || commit.parents.length <= 1;
    });

    // Helper to check if a commit is authored or co-authored by a bot (e.g., Beetle)
    const isBotCommit = (commit: any): boolean => {
      const authorLogin = commit?.author?.login || '';
      const committerLogin = commit?.committer?.login || '';
      const message = commit?.message || '';

      // Check if author or committer is a bot
      const isAuthorBot = /\[bot\]$/i.test(authorLogin) || /^bot-/i.test(authorLogin) || /-bot$/i.test(authorLogin);
      const isCommitterBot = /\[bot\]$/i.test(committerLogin) || /^bot-/i.test(committerLogin) || /-bot$/i.test(committerLogin);

      // Check for Co-authored-by trailer in commit message (Beetle suggestions)
      const hasBotCoAuthor = /Co-authored-by:.*\[bot\]/i.test(message) || 
                             /Co-authored-by:.*beetle/i.test(message);

      return isAuthorBot || isCommitterBot || hasBotCoAuthor;
    };

    let prDataInsertedId: string | undefined;

    const ignoredExtensions = new Set([
      'png','jpg','jpeg','gif','webp','bmp','svg','ico','psd','ai','tiff','tif','heic','heif',
      'mp4','mov','avi','mkv','webm','mp3','wav','flac','ogg',
      'pdf','zip','rar','7z','tar','gz','tgz',
      'woff','woff2','ttf','otf'
    ]);
    const isAnalyzable = (filename: string, patch?: string) => {
const ext = (filename?.split('.')?.pop() || '').toLowerCase();

      if (ignoredExtensions.has(ext)) return false;
      if (!patch) return false;
      return true;
    };

    if (analyzableCommits.length === 0) {
      logger.info("No new commits detected for PR; skipping review", {
        prNumber: pull_request.number,
        repository: repository.full_name,
        latestCommitSha
      });

      // Post skip comment for no new changes
      const [owner, repo] = repository.full_name.split('/');
      const prCommentService = new PRCommentService({
        installationId: installation.id,
        owner,
        repo,
        pullNumber: pull_request.number,
        commitSha: pull_request.head.sha,
      });
      await prCommentService.postNoChangesSkippedComment();
      
      // Create skipped analysis record
      await createSkippedAnalysis('No new commits detected since last review.');
      
      return;
    }

       // If we have at least some human commits, analyze ALL commits (including bot ones)
    console.log(analyzableCommits.map(el => el.message))
      

    modelAnalysisData.changes.commits = analyzableCommits.map((commit: any) => {
    const filteredFiles = (commit.files || []).filter((file: any) => isAnalyzable(file.filename, file.patch));
    return {
      sha: commit.sha,
      message: commit.message,
      author: commit.author.name || commit.author.login,
      date: commit.author.date,
      files: filteredFiles.map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
      }))
    };
  });

    // Check if ALL new commits are bot-authored/co-authored - skip review entirely if so
    // Skip this check if triggered by @beetle-ai review command
    if (!skipBotCheck) {
      const allCommitsAreBot = analyzableCommits.every((commit: any) => isBotCommit(commit));
      if (allCommitsAreBot) {
        logger.info("All new commits are bot-authored/co-authored; skipping review", {
          prNumber: pull_request.number,
          repository: repository.full_name,
          totalNewCommits: analyzableCommits.length,
        });

        // Post skip comment when all commits are from bots
        const [owner, repo] = repository.full_name.split('/');
        const prCommentService = new PRCommentService({
          installationId: installation.id,
          owner,
          repo,
          pullNumber: pull_request.number,
          commitSha: pull_request.head.sha,
        });
        await prCommentService.postBotAuthorSkippedComment();
        modelAnalysisData.skipped = true;

        // Save skipped PR data to database
        const insertResult = await prCollection?.insertOne(modelAnalysisData);
        logger.info("Skipped PR data inserted into MongoDB", { 
          prNumber: pull_request.number, 
          repository: repository.full_name,
          insertedId: insertResult?.insertedId,
          skipped: true,
        });

        return;
      }
    }

 

    const filesChangedForAnalysis = Array.from(new Set(
      (analyzableCommits || [])
        .flatMap((commit: any) => (commit.files || [])
          .filter((file: any) => isAnalyzable(file.filename, file.patch))
          .flatMap((file: any) => [file.filename, file.previousFilename].filter(Boolean)))
    ));
    const ignoredFilesForAnalysis = Array.from(new Set(
      (analyzableCommits || [])
        .flatMap((commit: any) => (commit.files || [])
          .filter((file: any) => !isAnalyzable(file.filename, file.patch))
          .flatMap((file: any) => [file.filename, file.previousFilename].filter(Boolean)))
    ));
    console.log("🔍 Files changed for analysis (from new commits): ", filesChangedForAnalysis);
    console.log("🚫 Ignored files (non-analyzable): ", ignoredFilesForAnalysis);


    // Total files changed > 100? Skip review (check BEFORE inserting PR data)
    const totalFilesChanged = filesChangedForAnalysis.length;
    
    // Check if there are NO analyzable files - skip silently
    if (totalFilesChanged === 0) {
      logger.info("No analyzable files changed in PR; skipping review silently", {
        prNumber: pull_request.number,
        repository: repository.full_name,
        totalFilesChanged: 0,
        ignoredFilesCount: ignoredFilesForAnalysis.length
      });

      // Skip silently without posting comment or creating analysis record
      return;
    }
    
    if (totalFilesChanged > 100) {
      logger.info("PR has too many files; skipping review", {
        prNumber: pull_request.number,
        repository: repository.full_name,
        totalFilesChanged,
        limit: 100
      });

      const [owner, repo] = repository.full_name.split('/');
      const prCommentService = new PRCommentService({
        installationId: installation.id,
        owner,
        repo,
        pullNumber: pull_request.number,
        commitSha: pull_request.head.sha,
      });
      await prCommentService.postTooManyFilesSkippedComment(totalFilesChanged);
      
      // Create skipped analysis record
      await createSkippedAnalysis(`PR has ${totalFilesChanged} files changed, exceeding the limit of 100 files.`);
      
      // Insert skipped PR data (only once)
      modelAnalysisData.skipped = true;
      await prCollection?.insertOne(modelAnalysisData);
      
      return;
    }

    // Insert PR data for analysis (only if not skipped above)
    const insertResult = await prCollection?.insertOne(modelAnalysisData);
    prDataInsertedId = insertResult?.insertedId?.toString();
    logger.info("PR data inserted into MongoDB", { 
      prNumber: pull_request.number, 
      repository: repository.full_name,
      insertedId: insertResult?.insertedId,
      newCommitsCount: analyzableCommits.length
    });

    // Fallback to previous entry id if we didn't insert a new one
    if (!prDataInsertedId) {
      prDataInsertedId = previousEntry?._id?.toString();
    }

    const sandbox_token = await mongoose.connection.db?.collection('auth_tokens').findOne({type: "sandbox"})
    if(!sandbox_token?.auth_token) {
      logger.error("Unable to find sandbox token");
      return
    }
    // 🚀 Trigger Sandbox Analysis for PR
    logger.info("Triggering sandbox analysis for PR", { 
      prNumber: pull_request.number, 
      repository: repository.full_name 
    });
    
    try {

       const githubInstallation = await Github_Installation.findOne({installationId: installation.id})
       if(!githubInstallation?.userId) {
        logger.error("Unable to find user ID for installation", { installationId: installation.id });
        return
       } 

       const user = await User.findById(githubInstallation?.userId)
       if(!user?.email) {
        logger.warn("Unable to find user email", { userId: githubInstallation.userId });
       }

      // Check if repository exists in our database and populate installation to get userId
      const githubRepo = await Github_Repository.findOne({ 
        fullName: repository.full_name 
      }).populate('github_installationId');
      console.log("🚀 Repository found in database", { 
        repository: repository.full_name, 
        prNumber: pull_request.number 
      });

      if (githubRepo && githubRepo.trackGithubPullRequests) {
        logger.info("Starting PR analysis for repository", { 
          repository: repository.full_name, 
          prNumber: pull_request.number 
        });
        

       // Generate unique analysis ID for this PR analysis
        const repoUrl = `https://github.com/${repository.full_name}`;
        const branchForAnalysis = pull_request.head.ref;
        
        // Create PR-specific analysis prompt
        const prAnalysisPrompt = `Analyze this Pull Request for security vulnerabilities, code quality issues, and potential bugs.`

        // Initialize PR comment service
        const [owner, repo] = repository.full_name.split('/');

        // Get comment severity threshold and PR summary settings from user/team settings
        let commentSeverityThreshold = 1; // Default: Medium and above
        let prSummarySettings = { enabled: true }; // Default: enabled
        try {
          const userSettings = user?.settings as any;
          if (typeof userSettings?.commentSeverity === 'number') {
            commentSeverityThreshold = userSettings.commentSeverity;
          }
          // Get user PR summary settings
          if (userSettings?.prSummarySettings && typeof userSettings.prSummarySettings === 'object') {
            prSummarySettings = {
              enabled: userSettings.prSummarySettings.enabled ?? true
            };
          }
          
          // If repo belongs to a team, try to use team settings (team settings override user settings)
          if (githubRepo.teamId) {
            const Team = mongoose.model('Team');
            const team = await Team.findById(githubRepo.teamId).select('settings');
            const teamSettings = team?.settings as any;
            if (typeof teamSettings?.commentSeverity === 'number') {
              commentSeverityThreshold = teamSettings.commentSeverity;
            }
            // Override with team PR summary settings if available
            if (teamSettings?.prSummarySettings && typeof teamSettings.prSummarySettings === 'object') {
              prSummarySettings = {
                enabled: teamSettings.prSummarySettings.enabled ?? true
              };
            }
          }
          logger.info('Using comment severity threshold and PR summary settings', { 
            threshold: commentSeverityThreshold, 
            meanings: { 0: 'all', 1: 'medium+', 2: 'critical only' },
            prSummaryEnabled: prSummarySettings.enabled,
            prNumber: pull_request.number 
          });
        } catch (settingsErr) {
          logger.warn('Failed to fetch settings, using defaults', { 
            error: settingsErr instanceof Error ? settingsErr.message : settingsErr 
          });
        }

        const prCommentContext: PRCommentContext = {
          installationId: installation.id,
          owner,
          repo,
          pullNumber: pull_request.number,
          commitSha: pull_request.head.sha,
          filesChanged: filesChangedForAnalysis,
          severityThreshold: commentSeverityThreshold,
          prSummarySettings: prSummarySettings,
        };

        // Create/Update GitHub Check Run to reflect Beetle AI review status
        let checkRunId: number | undefined;
        let usedStatusFallback = false;
        try {
          const detailsUrl = `https://beetleai.dev/github/${encodeURIComponent(repository.full_name)}/pull/${pull_request.number}`;
          const checkRun = await octokit.checks.create({
            owner,
            repo,
            name: 'Beetle',
            head_sha: pull_request.head.sha,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            external_id: prDataInsertedId || prKey,
            details_url: detailsUrl,
            output: {
              title: 'Beetle AI is reviewing…',
              summary: `Analyzing PR #${pull_request.number} for issues and suggestions.`,
              text: 'Streaming analysis in progress. Comments will appear as suggestions on the PR.'
            }
          });
          checkRunId = checkRun.data.id;
          logger.info('Created Beetle AI check run', { checkRunId, prNumber: pull_request.number, repository: repository.full_name });
        } catch (checkErr) {
          logger.warn('Failed to create GitHub Check Run (Beetle AI Review). Ensure app has checks:write permission.', {
            error: checkErr instanceof Error ? checkErr.message : checkErr,
            prNumber: pull_request.number,
            repository: repository.full_name
          });
          // Fallback to classic commit status API
          try {
            await octokit.repos.createCommitStatus({
              owner,
              repo,
              sha: pull_request.head.sha,
              state: 'pending',
              context: 'Beetle',
              description: 'Beetle AI is reviewing…',
              target_url: `https://beetleai.dev/github/${encodeURIComponent(repository.full_name)}/pull/${pull_request.number}`
            });
            usedStatusFallback = true;
            logger.info('Created fallback commit status for Beetle AI Review', { prNumber: pull_request.number });
          } catch (statusErr) {
            logger.warn('Failed to create fallback commit status', { error: statusErr instanceof Error ? statusErr.message : statusErr });
          }
        }
        // Pre-generate an Analysis ID to link streaming, Redis counters, and finalization
        const preAnalysisId = new mongoose.Types.ObjectId().toString();

        // Pre-create analysis record with running status and PR metadata
        try {
          const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
          // Calculate lines of code from NEW commits only (not entire PR)
          const reviewedLinesOfCode = analyzableCommits.reduce((total, commit) => {
            const commitAdditions = commit.stats?.additions || 0;
            const commitDeletions = commit.stats?.deletions || 0;
            return total + commitAdditions + commitDeletions;
          }, 0);
          const createPayload: any = {
            _id: preAnalysisId,
            analysis_type: "pr_analysis",
            userId: githubInstallation.userId,
            teamId: githubRepo.teamId || undefined,
            repoUrl,
            github_repositoryId: githubRepo._id,
            sandboxId: "",
            model: "gemini-2.5-pro",
            prompt: prAnalysisPrompt,
            status: "running",
            pr_number: pull_request.number,
            pr_url: prUrl,
            pr_title: pull_request.title,
            reviewedLinesOfCode,
          };
          await Analysis.create(createPayload);
          logger.info("Pre-created analysis record", { analysisId: preAnalysisId, repo: repository.full_name, prNumber: pull_request.number });
        } catch (createErr) {
          logger.warn("Failed to pre-create analysis record", { analysisId: preAnalysisId, error: createErr instanceof Error ? createErr.message : createErr });
        }
        const prCommentService = new PRCommentService({
          ...prCommentContext,
          analysisId: preAnalysisId,
        });
        // Initialize Redis comment counter with TTL for cleanup (safe if already incremented)
        try {
          await initAnalysisCommentCounter(preAnalysisId);
        } catch (initErr) {
          logger.warn("Failed to initialize Redis comment counter", { analysisId: preAnalysisId, error: initErr instanceof Error ? initErr.message : initErr });
        }
        
        // Initialize parser state for streaming response parsing
        const parserState = createParserState();
        
        await prCommentService.postAnalysisStartedComment(analyzableCommits, filesChangedForAnalysis, ignoredFilesForAnalysis);

        // Define streaming callbacks for PR analysis
        const callbacks: StreamingCallbacks = {
          onStdout: async (data: string) => {
            logger.debug(`PR analysis stdout ${data.slice(0, 100)}`, { prNumber: pull_request.number, data });
            
            // Parse the streaming data for PR comments
            const { prComments, state } = parseStreamingResponse(data, parserState);
            
            // Update parser state
            Object.assign(parserState, state);
            
            // Post any extracted PR comments
            if (prComments.length > 0) {
              logger.info("Found PR comments to post", { 
                prNumber: pull_request.number, 
                commentsCount: prComments.length 
              });
              const postedCount = await prCommentService.postComments(prComments);
              // logger.info("Posted PR comments", { 
              //   prNumber: pull_request.number, 
              //   postedCount, 
              //   totalComments: prComments.length 
              // });
            }
          },
          onStderr: async (data: string) => {
            logger.error(`PR analysis stderr ${data.slice(0, 100)}`, { prNumber: pull_request.number, error: data });
            
            // Also parse stderr for potential PR comments (in case of mixed output)
            const { prComments, state } = parseStreamingResponse(data, parserState);
            Object.assign(parserState, state);
            
            if (prComments.length > 0) {
              await prCommentService.postComments(prComments);
            }
          },
          onProgress: async (message: string) => {
            logger.debug("PR analysis progress", { prNumber: pull_request.number, message });
          },
        };

        // Start analysis in background (don't await to avoid blocking webhook response)
        const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
        // Get the team ID from the repository
        const teamIdForAnalysis = githubRepo.teamId || undefined;
        executeAnalysis(
          githubRepo._id as string,
          repoUrl,
          branchForAnalysis,
          githubInstallation.userId,
          prAnalysisPrompt,
          "pr_analysis",
          "github",
          callbacks,
          {
            pr_data_id: prDataInsertedId,
            auth_token: sandbox_token.auth_token,
            base_url: process.env.API_BASE_URL || "https://api.beetleai.dev",
            pr_number: pull_request.number,
            pr_url: prUrl,
            pr_title: pull_request.title,
            repo_url: repoUrl,
          },
          user.email,
          teamIdForAnalysis,
          preAnalysisId
        ).then(async (result) => {
          logger.info("PR analysis completed", { 
            repository: repository.full_name, 
            prNumber: pull_request.number, 
            result 
          });

          // If analysis failed, handle as error case
          if (!result.success) {
            logger.warn("PR analysis returned failure", { 
              repository: repository.full_name, 
              prNumber: pull_request.number, 
              error: result.error 
            });
            
            // Mark GitHub Check Run as failed
            if (checkRunId) {
              try {
                await octokit.checks.update({
                  owner,
                  repo,
                  check_run_id: checkRunId,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  conclusion: 'failure',
                  output: {
                    title: 'Beetle AI review failed',
                    summary: `Analysis encountered an error for PR #${pull_request.number}.`,
                    text: result.error || 'Unknown error.'
                  }
                });
                logger.info('Updated Beetle AI check run to failed', { checkRunId, prNumber: pull_request.number });
              } catch (updateErr) {
                logger.warn('Failed to update GitHub Check Run to failed', { error: updateErr instanceof Error ? updateErr.message : updateErr, checkRunId });
              }
            } else if (usedStatusFallback) {
              try {
                await octokit.repos.createCommitStatus({
                  owner,
                  repo,
                  sha: pull_request.head.sha,
                  state: 'failure',
                  context: 'Beetle',
                  description: 'Beetle AI review failed',
                  target_url: `https://beetleai.dev/github/${encodeURIComponent(repository.full_name)}/pull/${pull_request.number}`
                });
              } catch (statusErr) {
                logger.warn('Failed to update fallback commit status to failure', { error: statusErr instanceof Error ? statusErr.message : statusErr });
              }
            }
            return; // Early return - don't process success flow
          }
          
          // Process any remaining content in parser state
          const finalComments = finalizeParsing(parserState);
          if (finalComments.length > 0) {
            logger.info("Processing final comments", { 
              prNumber: pull_request.number, 
              finalCommentsCount: finalComments.length 
            });
            await prCommentService.postComments(finalComments);
          }

          // Check if no actual issues were found - post "good to merge" comment
          const totalIssuesPosted = prCommentService.getNonSummaryCommentsPosted();
          if (totalIssuesPosted === 0) {
            logger.info("No issues found during analysis, posting no-issues comment", {
              prNumber: pull_request.number,
              repository: repository.full_name
            });
            try {
              await prCommentService.postNoIssuesFoundComment();
            } catch (noIssuesErr) {
              logger.warn("Failed to post no-issues-found comment", {
                prNumber: pull_request.number,
                repository: repository.full_name,
                error: noIssuesErr instanceof Error ? noIssuesErr.message : noIssuesErr
              });
            }
          }

          // Mark GitHub Check Run as completed
          if (checkRunId) {
            try {
              await octokit.checks.update({
                owner,
                repo,
                check_run_id: checkRunId,
                status: 'completed',
                completed_at: new Date().toISOString(),
                conclusion: 'success',
                output: {
                  title: 'Beetle AI review completed',
                  summary: `Beetle AI finished analyzing PR #${pull_request.number}.`,
                  text: `Posted ${finalComments.length} additional comments.`
                }
              });
              logger.info('Updated Beetle AI check run to completed', { checkRunId, prNumber: pull_request.number });
            } catch (updateErr) {
              logger.warn('Failed to update GitHub Check Run to completed', { error: updateErr instanceof Error ? updateErr.message : updateErr, checkRunId });
            }
          } else if (usedStatusFallback) {
            try {
              await octokit.repos.createCommitStatus({
                owner,
                repo,
                sha: pull_request.head.sha,
                state: 'success',
                context: 'Beetle',
                description: 'Beetle AI review completed',
                target_url: `https://beetleai.dev/github/${encodeURIComponent(repository.full_name)}/pull/${pull_request.number}`
              });
            } catch (statusErr) {
              logger.warn('Failed to update fallback commit status to success', { error: statusErr instanceof Error ? statusErr.message : statusErr });
            }
          }
          
          // Post analysis completion comment
          // await prCommentService.postAnalysisCompletedComment(result?.sandboxId || undefined);
          
          // Note: Persistence is now handled automatically by executeAnalysis function
        }).catch(async (error) => {
          logger.error("PR analysis failed", { 
            repository: repository.full_name, 
            prNumber: pull_request.number, 
            error: error instanceof Error ? error.message : error 
          });
          
          // Post error comment on PR
          await prCommentService.postAnalysisErrorComment(error.message || 'Unknown error occurred during analysis');

          // Mark GitHub Check Run as failed
          if (checkRunId) {
            try {
              await octokit.checks.update({
                owner,
                repo,
                check_run_id: checkRunId,
                status: 'completed',
                completed_at: new Date().toISOString(),
                conclusion: 'failure',
                output: {
                  title: 'Beetle AI review failed',
                  summary: `Analysis encountered an error for PR #${pull_request.number}.`,
                  text: error?.message || 'Unknown error.'
                }
              });
            } catch (updateErr) {
              logger.warn('Failed to update GitHub Check Run to failure', { error: updateErr instanceof Error ? updateErr.message : updateErr, checkRunId });
            }
          } else if (usedStatusFallback) {
            try {
              await octokit.repos.createCommitStatus({
                owner,
                repo,
                sha: pull_request.head.sha,
                state: 'failure',
                context: 'Beetle',
                description: 'Beetle AI review failed',
                target_url: `https://beetleai.dev/github/${encodeURIComponent(repository.full_name)}/pull/${pull_request.number}`
              });
            } catch (statusErr) {
              logger.warn('Failed to update fallback commit status to failure', { error: statusErr instanceof Error ? statusErr.message : statusErr });
            }
          }
        });

        logger.info("PR analysis initiated", { 
          repository: repository.full_name, 
          prNumber: pull_request.number 
        });
      } else {
        logger.info("Skipping analysis - repository not found or analysis not enabled", { 
          repository: repository.full_name 
        });
      }
    } catch (analysisError) {
      logger.error("Error triggering PR analysis", { 
        error: analysisError instanceof Error ? analysisError.message : analysisError 
      });
      // Don't throw here to avoid breaking the webhook response
    }

    return modelAnalysisData;
    
  } catch (error) {
    console.error('Error handling pull_request.opened:', error);
    throw error;
  }
};
