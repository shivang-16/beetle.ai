// apps/api/src/queries/bitbucket.queries.ts
import { logger } from '../utils/logger.js';
import { Bitbucket_Workspace } from '../models/bitbucket_workspace.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import User from '../models/user.model.js';
import Analysis from '../models/analysis.model.js';
import mongoose from 'mongoose';
import SubscriptionPlan from '../models/subscription_plan.model.js';
import { FeatureAccessChecker } from '../middlewares/helpers/checkAccessService.js';
import {
  isPrAuthorBot,
  createSkippedAnalysis as createSkippedAnalysisHelper,
  checkDailyPrAnalysisLimit,
  getNewCommitsSinceLastReview,
  generatePrKey,
  getLatestCommitSha,
  shouldSkipBotAuthor,
  shouldSkipNoNewCommits,
  buildDailyLimitSkipReason,
  SkipReason,
} from './helpers/index.js';
import { getBitbucketAccessToken } from '../utils/bitbucketTokenManager.js';
import { executeAnalysis, StreamingCallbacks } from '../services/sandbox/executeAnalysis.js';
import { createParserState, parseStreamingResponse, finalizeParsing } from "../utils/responseParser.js";
import { BitbucketPRCommentService } from '../services/analysis/bitbucketPrCommentService.js';
import { initAnalysisCommentCounter } from "../utils/analysisStreamStore.js";

/**
 * Process Bitbucket PR webhook data and format it like GitHub PR data
 * This ensures both GitHub and Bitbucket PRs can be processed identically
 */
export const BitbucketPrData = async (payload: any, options?: { skipBotCheck?: boolean }) => {
  try {

    // console.log("Bitbucket PR data", payload);
    const { pullrequest, repository, actor } = payload;
    const skipBotCheck = options?.skipBotCheck || false;

    logger.debug("Processing Bitbucket PR data", {
      repositoryName: repository?.full_name,
      prId: pullrequest?.id,
      prNumber: pullrequest?.id, // Bitbucket uses ID, not number
      skipBotCheck,
    });

    // Helper function to create a skipped analysis record
    const createSkippedAnalysis = async (skipReason: string) => {
      const workspace = await Bitbucket_Workspace.findOne({ 
        workspaceSlug: repository.workspace.slug 
      });
      if (!workspace?.userId) return null;

      const bitbucketRepo = await Github_Repository.findOne({ 
        fullName: repository.full_name 
      });
      if (!bitbucketRepo) return null;

      const repoUrl = repository.links.html.href;
      const prUrl = pullrequest.links.html.href;
      
      return createSkippedAnalysisHelper({
        userId: workspace.userId,
        teamId: bitbucketRepo.teamId,
        repoUrl,
        repositoryId: bitbucketRepo._id as string,
        prNumber: pullrequest.id,
        prUrl,
        prTitle: pullrequest.title,
        skipReason,
        repositoryFullName: repository.full_name,
      });
    };

    // Early check: Is PR author a bot? Skip automatic review if so.
    const prAuthorLogin = pullrequest?.author?.nickname || pullrequest?.author?.display_name || '';
    const prAuthorType = pullrequest?.author?.type || '';
    
    if (shouldSkipBotAuthor(prAuthorLogin, prAuthorType, skipBotCheck)) {
      logger.info("PR author is a bot; skipping automatic review", {
        author: prAuthorLogin,
        authorType: prAuthorType,
        prId: pullrequest?.id,
        repository: repository?.full_name,
      });

      // TODO: Post a comment informing how to trigger review
      await createSkippedAnalysis(SkipReason.BOT_AUTHOR);
      return;
    }

    // Early check: daily PR analysis limit
    try {
      const workspace = await Bitbucket_Workspace.findOne({ 
        workspaceSlug: repository.workspace.slug 
      });
      
      if (workspace?.userId) {
        const limitCheck = await checkDailyPrAnalysisLimit(workspace.userId);

        if (!limitCheck.allowed) {
          // TODO: Post daily limit reached comment to Bitbucket PR
          const skipReason = buildDailyLimitSkipReason(
            limitCheck.planName!,
            limitCheck.currentCount!,
            limitCheck.maxAllowed!
          );
          await createSkippedAnalysis(skipReason);

          logger.info("PR analysis blocked due to daily limit", {
            userId: workspace.userId,
            planName: limitCheck.planName,
            currentCount: limitCheck.currentCount,
            maxAllowed: limitCheck.maxAllowed,
            prId: pullrequest.id,
            repository: repository.full_name,
          });

          return; // Stop further processing when limit is reached
        }
      }
    } catch (limitErr) {
      logger.warn("Failed to perform PR analysis daily limit check", { 
        error: limitErr instanceof Error ? limitErr.message : limitErr 
      });
    }

    // Get workspace for user/team lookup
    const workspace = await Bitbucket_Workspace.findOne({ 
      workspaceSlug: repository.workspace.slug 
    });
    
    if (!workspace) {
      logger.error("Workspace not found for Bitbucket PR", {
        workspaceSlug: repository.workspace.slug,
        repository: repository.full_name
      });
      return;
    }

    // Get valid access token (automatically refreshes if expired)
    const tokenResult = await getBitbucketAccessToken(repository.workspace.slug);
    
    if (!tokenResult.success) {
      logger.error("Failed to get valid Bitbucket access token", {
        workspaceSlug: repository.workspace.slug,
        error: tokenResult.error,
        errorType: tokenResult.errorType
      });
      await createSkippedAnalysis(tokenResult.error || 'Failed to authenticate with Bitbucket');
      return;
    }

    const currentAccessToken = tokenResult.accessToken!;

    // Fetch additional PR details from Bitbucket API
    let commits: any[] = [];
    let diffContent = '';
    let filesChanged: any[] = [];

    try {
      // Fetch commits
      const commitsResponse = await fetch(
        pullrequest.links.commits.href,
        {
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Accept': 'application/json'
          }
        }
      );


      if (commitsResponse.ok) {
        const commitsData: any = await commitsResponse.json();
        const commitsList = (commitsData.values || []).map((commit: any) => ({
          sha: commit.hash,
          message: commit.message,
          author: {
            name: commit.author?.user?.display_name || commit.author?.raw,
            email: commit.author?.user?.email,
            date: commit.date,
            login: commit.author?.user?.nickname
          },
          committer: {
            name: commit.author?.user?.display_name || commit.author?.raw,
            email: commit.author?.user?.email,
            date: commit.date,
            login: commit.author?.user?.nickname
          },
          parents: commit.parents?.map((p: any) => p.hash) || [],
          url: commit.links?.html?.href,
          stats: {
            additions: 0,
            deletions: 0,
            total: 0
          },
          files: [] as any[]
        }));

        // Fetch files for each commit
        for (const commit of commitsList) {

          try {
            // Fetch diffstat for file list
            const commitDiffstatUrl = `https://api.bitbucket.org/2.0/repositories/${repository.full_name}/diffstat/${commit.sha}`;
            const commitDiffstatResponse = await fetch(commitDiffstatUrl, {
              headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
                'Accept': 'application/json'
              }
            });



            if (commitDiffstatResponse.ok) {
              const commitDiffstatData: any = await commitDiffstatResponse.json();
              
              // Fetch the full diff for this commit to get patches
              const commitDiffUrl = `https://api.bitbucket.org/2.0/repositories/${repository.full_name}/diff/${commit.sha}`;
              const commitDiffResponse = await fetch(commitDiffUrl, {
                headers: {
                  'Authorization': `Bearer ${currentAccessToken}`,
                  'Accept': 'text/plain'
                }
              });

              let fullDiff = '';
              if (commitDiffResponse.ok) {
                fullDiff = await commitDiffResponse.text();
              }

              // Parse the diff to extract per-file patches
              const filePatchesMap = parseDiffToFilePatches(fullDiff);

              const files = (commitDiffstatData.values || []).map((file: any) => {
                const filename = file.new?.path || file.old?.path || 'unknown';
                return {
                  filename,
                  status: file.status, // modified, added, removed
                  additions: file.lines_added || 0,
                  deletions: file.lines_removed || 0,
                  changes: (file.lines_added || 0) + (file.lines_removed || 0),
                  patch: filePatchesMap[filename] || ''
                };
              });


              commit.files = files;
              commit.stats.additions = files.reduce((sum: number, f: any) => sum + f.additions, 0);
              commit.stats.deletions = files.reduce((sum: number, f: any) => sum + f.deletions, 0);
              commit.stats.total = commit.stats.additions + commit.stats.deletions;
            }
          } catch (err) {
            logger.warn('Failed to fetch files for commit', {
              commitSha: commit.sha,
              error: err instanceof Error ? err.message : err
            });
          }
        }

       
        commits = commitsList;
      } else {
        logger.error('Failed to fetch commits from Bitbucket', {
          status: commitsResponse.status,
          statusText: commitsResponse.statusText,
          url: pullrequest.links.commits.href
        });
      }

      // Fetch diff
      const diffResponse = await fetch(
        pullrequest.links.diff.href,
        {
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Accept': 'text/plain'
          }
        }
      );

      if (diffResponse.ok) {
        diffContent = await diffResponse.text();
      } else {
        logger.error('Failed to fetch diff from Bitbucket', {
          status: diffResponse.status,
          statusText: diffResponse.statusText,
          url: pullrequest.links.diff.href
        });
      }

      // Fetch files changed (diffstat)
      const diffstatResponse = await fetch(
        pullrequest.links.diffstat.href,
        {
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (diffstatResponse.ok) {
        const diffstatData: any = await diffstatResponse.json();
        filesChanged = (diffstatData.values || []).map((file: any) => ({
          filename: file.new?.path || file.old?.path,
          status: file.status, // modified, added, removed
          additions: file.lines_added || 0,
          deletions: file.lines_removed || 0,
          changes: (file.lines_added || 0) + (file.lines_removed || 0),
          patch: '', // Bitbucket doesn't provide per-file patches in diffstat
        }));
      } else {
        logger.error('Failed to fetch diffstat from Bitbucket', {
          status: diffstatResponse.status,
          statusText: diffstatResponse.statusText,
          url: pullrequest.links.diffstat.href
        });
      }

    } catch (apiError) {
      logger.error('Error fetching additional Bitbucket PR data:', { 
        error: apiError instanceof Error ? apiError.message : apiError 
      });
    }

    logger.debug("Bitbucket API fetch results", {
      commitsCount: commits.length,
      filesChangedCount: filesChanged.length,
      hasDiffContent: diffContent.length > 0,
      commitShas: commits.map(c => c.sha).slice(0, 5), // First 5 SHAs
    });

    // Get teamId from repository
    const bitbucketRepoForTeam = await Github_Repository.findOne({ 
      fullName: repository.full_name 
    });
    const teamIdForPrData = bitbucketRepoForTeam?.teamId || undefined;

    // Create a unique key per PR for deduplication
    const prKey = generatePrKey(repository.full_name, pullrequest.id);
    const latestCommitSha = getLatestCommitSha(commits, pullrequest.source.commit.hash);

    // Format data to match GitHub PR structure
    const modelAnalysisData: any = {
      // Essential PR Information
      pr: {
        number: pullrequest.id, // Bitbucket uses ID instead of number
        title: pullrequest.title,
        description: pullrequest.description || pullrequest.summary?.raw || '',
        state: pullrequest.state, // OPEN, MERGED, DECLINED, SUPERSEDED
        isDraft: false, // Bitbucket doesn't have draft PRs
        createdAt: pullrequest.created_on,
        updatedAt: pullrequest.updated_on
      },

      // PR Author information
      author: {
        username: pullrequest.author.nickname || pullrequest.author.display_name,
        name: pullrequest.author.display_name,
        avatar: pullrequest.author.links?.avatar?.href
      },

      // Team ID for team-based tracking
      teamId: teamIdForPrData,

      // Repository Info
      repository: {
        name: repository.full_name,
        url: repository.links.html.href,
        defaultBranch: repository.mainbranch?.name || 'main'
      },

      // Branch Information
      branches: {
        head: {
          ref: pullrequest.source.branch.name,
          sha: pullrequest.source.commit.hash
        },
        base: {
          ref: pullrequest.destination.branch.name,
          sha: pullrequest.destination.commit.hash
        }
      },

      // Unique identifiers
      prKey,
      latestCommitSha,
      state: pullrequest.state.toLowerCase() === 'open' ? 'open' : 'closed',
      skipped: false,

      // Core Changes Data
      changes: {
        summary: {
          files: filesChanged.length,
          additions: filesChanged.reduce((sum, f) => sum + f.additions, 0),
          deletions: filesChanged.reduce((sum, f) => sum + f.deletions, 0),
          commits: commits.length
        },

        commits: commits.map((commit: any) => ({
          sha: commit.sha,
          message: commit.message,
          author: commit.author.name || commit.author.login,
          date: commit.author.date,
          files: commit.files || [] // Use files fetched from Bitbucket API
        })),

        fullDiff: diffContent.slice(0, 100000)
      },

      // PR Comments and Reviews
      feedback: {
        reviews: [], // TODO: Fetch Bitbucket reviews
        commentCount: pullrequest.comment_count || 0,
        reviewCommentCount: 0
      },

      // Labels (Bitbucket doesn't have labels like GitHub)
      labels: [],

      // Analysis hints
      context: {
        complexity: Math.min(100, (filesChanged.length * 3) + 
          Math.floor((filesChanged.reduce((sum, f) => sum + f.changes, 0)) / 20)),
        riskLevel: filesChanged.length > 15 ? 'high' : filesChanged.length > 8 ? 'medium' : 'low',
        hasTests: filesChanged.some(f => f.filename.includes('test') || f.filename.includes('spec')),
        hasDocChanges: filesChanged.some(f => f.filename.includes('README') || f.filename.includes('.md')),
        hasDependencyChanges: filesChanged.some(f => 
          f.filename.includes('package.json') || f.filename.includes('requirements.txt')),
        primaryLanguages: [...new Set(filesChanged.map(f => 
          f.filename.split('.').pop()).filter(Boolean))].slice(0, 5)
      },

      createdAt: new Date(),
      source: 'bitbucket' // Mark as Bitbucket PR
    };

    // Store PR data in database
    const prCollection = mongoose.connection.db?.collection('pull_request_datas');
    
    // Check if we already have data for this PR
    const latestStored = await prCollection?.find({
      $or: [
        { prKey },
        { 'pr.number': pullrequest.id, 'repository.name': repository.full_name }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

    const previousEntry = latestStored && latestStored[0] ? latestStored[0] : null;
    const lastStoredSha: string | undefined = previousEntry?.latestCommitSha;

    // Determine new commits
    const newCommitsOnly = getNewCommitsSinceLastReview(commits, lastStoredSha);
    
    logger.debug("Bitbucket commit analysis", {
      totalCommits: commits.length,
      lastStoredSha,
      newCommitsCount: newCommitsOnly.length,
      commitShas: commits.map(c => c.sha),
    });

    if (shouldSkipNoNewCommits(newCommitsOnly)) {
      logger.info("No new commits detected for Bitbucket PR; skipping review", {
        prId: pullrequest.id,
        repository: repository.full_name,
        latestCommitSha
      });

      // TODO: Post skip comment to Bitbucket PR
      await createSkippedAnalysis(SkipReason.NO_NEW_COMMITS);
      return;
    }

    // Insert PR data
    const insertResult = await prCollection?.insertOne(modelAnalysisData);
    const prDataInsertedId = insertResult?.insertedId?.toString();

    logger.info("Bitbucket PR data stored successfully", {
      prDataId: prDataInsertedId,
      prId: pullrequest.id,
      repository: repository.full_name,
      newCommits: newCommitsOnly.length
    });

    // Trigger AI analysis in background
    const user = await User.findById(workspace.userId);
    if (user && bitbucketRepoForTeam) {
      const preAnalysisId = new mongoose.Types.ObjectId().toString();
      const repoUrl = repository.links.html.href;
      const prUrl = pullrequest.links.html.href;
      const branchForAnalysis = pullrequest.source.branch.name;

      const prAnalysisPrompt = `Analyze this Bitbucket pull request:\n\nPR: ${pullrequest.title}\nRepo: ${repository.full_name}\nFiles: ${filesChanged.length}, Commits: ${commits.length}`;

      // Initialize parser state
      const parserState = createParserState();

      // Initialize PR comment service
      const [workspaceSlug, repoSlug] = repository.full_name.split('/');
      
      // Get settings
      const userSettings = user.settings as any;
      const severityThreshold = typeof userSettings?.commentSeverity === 'number' ? userSettings.commentSeverity : 1;
      const prSummarySettings = userSettings?.prSummarySettings || { enabled: true };

      const prCommentService = new BitbucketPRCommentService({
        workspaceSlug,
        repoSlug,
        pullRequestId: pullrequest.id,
        commitSha: pullrequest.source.commit.hash,
        filesChanged: filesChanged.map(f => f.filename),
        analysisId: preAnalysisId,
        severityThreshold,
        prSummarySettings
      });

      // Initialize Redis counter
      await initAnalysisCommentCounter(preAnalysisId);

      // Post start comment
      await prCommentService.postAnalysisStartedComment(commits, filesChanged);

      const callbacks: StreamingCallbacks = {
        onStdout: async (data: string) => {
          logger.debug(`Bitbucket PR analysis stdout: ${data.slice(0, 200)}`, { prId: pullrequest.id, data });
          const { prComments, state } = parseStreamingResponse(data, parserState);
          Object.assign(parserState, state);
          
          if (prComments.length > 0) {
             await prCommentService.postComments(prComments);
          }
        },
        onStderr: async (data: string) => {
          logger.error(`Bitbucket PR analysis stderr: ${data.slice(0, 200)}`, { prId: pullrequest.id, error: data });
           const { prComments, state } = parseStreamingResponse(data, parserState);
           Object.assign(parserState, state);
           if (prComments.length > 0) {
             await prCommentService.postComments(prComments);
           }
        },
        onProgress: async (message: string) => {
          logger.debug('Bitbucket PR analysis progress', { 
            prId: pullrequest.id,
            message 
          });
        }
      };

      // const sandbox_token = await user.getSandboxToken();
      // do not need sandbox token for bitbucket

      executeAnalysis(
        bitbucketRepoForTeam._id as string,
        repoUrl,
        branchForAnalysis,
        workspace.userId,
        prAnalysisPrompt,
        "pr_analysis",
        "bitbucket",
        callbacks,
        {
          pr_data_id: prDataInsertedId,
          auth_token: null, // Bitbucket doesn't use sandbox auth token
          base_url: process.env.API_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3001",
          pr_number: pullrequest.id,
          pr_url: prUrl,
          pr_title: pullrequest.title,
          repo_url: repoUrl,
        },
        user.email,
        teamIdForPrData,
        preAnalysisId
      ).then(async (result) => {
          const finalComments = finalizeParsing(parserState);
          if (finalComments.length > 0) {
              await prCommentService.postComments(finalComments);
          }
          
          if (!result.success) {
             await prCommentService.postSkippedComment(`Analysis failed with error: ${result.error}`);
          }
      }).catch(async (error) => {
        logger.error("Analysis execution failed", {
          prId: pullrequest.id,
          error: error instanceof Error ? error.message : error
        });
        await prCommentService.postSkippedComment(`Analysis failed with error: ${error.message}`);
      });
    }

    return prDataInsertedId;

  } catch (error) {
    logger.error('Error processing Bitbucket PR data', {
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
};

/**
 * Parse a git diff into per-file patches
 * @param fullDiff - The full diff text
 * @returns Map of filename to patch content
 */
function parseDiffToFilePatches(fullDiff: string): Record<string, string> {
  const filePatchesMap: Record<string, string> = {};
  
  if (!fullDiff) return filePatchesMap;

  // Split diff by file headers (diff --git a/... b/...)
  const fileBlocks = fullDiff.split(/(?=diff --git)/);
  
  for (const block of fileBlocks) {
    if (!block.trim()) continue;
    
    // Extract filename from the diff header
    // Format: diff --git a/filename b/filename
    const fileMatch = block.match(/diff --git a\/(.+?) b\/(.+)/);
    if (!fileMatch) continue;
    
    const filename = fileMatch[2]; // Use the 'b/' filename (new file)
    
    // The entire block is the patch for this file
    filePatchesMap[filename] = block.trim();
  }
  
  return filePatchesMap;
}
