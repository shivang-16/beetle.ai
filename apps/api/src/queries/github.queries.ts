import { CreateInstallationInput, createInstallationSchema } from "../validations/github.validations.js";
import { Github_Installation } from "../models/github_installations.model.js";
import { CustomError } from "../middlewares/error.js";
import User from "../models/user.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import { getInstallationOctokit } from "../lib/githubApp.js";
import { join } from 'path';
import { executeAnalysis, StreamingCallbacks } from "../services/sandbox/executeAnalysis.js";
import { createParserState, parseStreamingResponse, finalizeParsing, ParserState } from "../lib/responseParser.js";
import { PRCommentService, PRCommentContext } from "../services/prCommentService.js";
import mongoose from "mongoose";

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
                 return new CustomError('Installation already exists', 409);
             }
            
             const user = await User.findOne({ username: input.sender.login });

             const installation_data = {
              installationId: input.installationId,
              userId: user ? user._id.toString() : null,
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
                                 defaultBranch: repoDetails.data.default_branch
                             };
                         } catch (error) {
                             console.error(`Failed to fetch default branch for ${repo.fullName}:`, error);
                             // Fallback to 'main' if we can't fetch the default branch
                             return {
                                 github_installationId: installation._id,
                                 repositoryId: repo.id,
                                 fullName: repo.fullName,
                                 private: repo.private,
                                 defaultBranch: 'main'
                             };
                         }
                     })
                 );
                 
                 await Github_Repository.insertMany(repositoriesWithDefaultBranch);
             }

             console.log("User updated")
             return installation;
    } catch (error) {
        console.log(error)
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
        console.log('[issues.opened] Missing repository id in payload');
        return;
      }

      const repoDoc = await Github_Repository.findOne({ repositoryId: repoId }).lean();
      if (!repoDoc) {
        console.log(`[issues.opened] Repository not found in DB. repoId=${repoId}`);
        return;
      }

      if (!repoDoc.trackGithubIssues) {
        console.log(`[issues.opened] Tracking disabled for repoId=${repoId} (${repoDoc.fullName})`);
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

      console.log('[GitHub][issues.opened]', details);

      // Post CTA comment to the issue
      if (details.installationId && details.issueNumber && details.fullName) {
        try {
          const [owner, repo] = details.fullName.split('/');
          const octokit = getInstallationOctokit(details.installationId);

          const linkTarget = `http://localhost:3000/analysis/${encodeURIComponent(details.fullName)}?issue=${details.issueNumber}&autoStart=1`;
          const body = [
            '🚀 Analyze and fix this issue with **[codetector-ai](https://github.com/apps/codetector-ai)**.',
            '',
            `[Start now →](${linkTarget})`
          ].join('\n');

          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: details.issueNumber,
            body
          });

          console.log('[GitHub][issues.opened] Posted CTA comment');
        } catch (postErr) {
          console.error('[GitHub][issues.opened] Failed to post CTA comment', postErr);
        }
      }
    } catch (err) {
      console.error('Error logging issues.opened:', err);
    }
  }


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
    console.log(`🔍 Looking for organization installation for ${owner}/${repo}`);
    
    // First, check if the user has access to any organization installations
    // Look for installations where the account matches the repository owner
    const orgInstallation = await Github_Installation.findOne({
      "account.login": owner,
      "account.type": "Organization"
    });

    if (!orgInstallation) {
      console.log(`❌ No organization installation found for ${owner}`);
      return null;
    }

    console.log(`✅ Found organization installation for ${owner}:`, {
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
      console.log(`👤 Installation sender: ${orgInstallation.sender.login}`);
      
      // If the user is the sender, they have access
      // You might want to add additional checks here based on your requirements
      return orgInstallation;
    }

    // If no sender or other access method, we'll still return the installation
    // but you might want to add more sophisticated access control
    console.log(`⚠️ No clear access control found, but returning installation for ${owner}`);
    return orgInstallation;
  } catch (error) {
    console.error("Error getting organization installation for repo:", error);
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
    
    console.log(`User installations for ${userId}:`, userInstallations.length);
    console.log(`Organization installations found:`, orgInstallations.length);
    
    return {
      userInstallations,
      orgInstallations
    };
  } catch (error) {
    console.error("Error getting all user installations:", error);
    return { userInstallations: [], orgInstallations: [] };
  }
};

// Check if installation has permission to create issues
export const checkIssueCreationPermission = (installation: any) => {
  try {
    if (!installation.permissions) {
      console.log("⚠️ No permissions found in installation");
      return false;
    }

    // Check if the installation has permission to create issues
    // GitHub App permissions for issues: "issues": "write" or "issues": "admin"
    const issuePermission = installation.permissions.get ? 
      installation.permissions.get("issues") : 
      installation.permissions["issues"];
    
    console.log(`🔐 Issue permission: ${issuePermission}`);
    
    // Return true if permission is "write" or "admin"
    return issuePermission === "write" || issuePermission === "admin";
  } catch (error) {
    console.error("Error checking issue creation permission:", error);
    return false;
  }
};

// Check if installation has permission to create pull requests
export const checkPullRequestPermission = (installation: any) => {
  try {
    if (!installation.permissions) {
      console.log("⚠️ No permissions found in installation");
      return false;
    }

    // Check if the installation has permission to create pull requests
    // GitHub App permissions for pull requests: "contents": "write" or "contents": "admin"
    const contentsPermission = installation.permissions.get ? 
      installation.permissions.get("contents") : 
      installation.permissions["contents"];
    
    console.log(`🔐 Contents permission: ${contentsPermission}`);
    
    // Return true if permission is "write" or "admin"
    return contentsPermission === "write" || contentsPermission === "admin";
  } catch (error) {
    console.error("Error checking pull request permission:", error);
    return false;
  }
};

export const PrData = async (payload: any) => {
  try {
    const { pull_request, repository, installation, sender } = payload;
   
    console.log(installation, repository)
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
      
      // Get commits in the PR
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
        url: commit.html_url,
        stats: {
          additions: commit.stats?.additions,
          deletions: commit.stats?.deletions,
          total: commit.stats?.total
        }
      }));
      
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
    const modelAnalysisData = {
      // Essential PR Information
      pr: {
        number: pull_request.number,
        title: pull_request.title,
        description: pull_request.body || '',
        state: pull_request.state,
        isDraft: pull_request.draft,
        author: pull_request.user.login,
        createdAt: pull_request.created_at,
        updatedAt: pull_request.updated_at
      },
      
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
      
      // Core Changes Data
      changes: {
        summary: {
          files: pull_request.changed_files,
          additions: pull_request.additions,
          deletions: pull_request.deletions,
          commits: pull_request.commits
        },
        files: filesChanged.map((file: any) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch // The actual diff
        })),
        commits: commits.map((commit: any) => ({
          sha: commit.sha,
          message: commit.message,
          author: commit.author.name || commit.author.login,
          date: commit.author.date
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
      }
    };

    const pr_data = await mongoose.connection.db?.collection('pull_request_datas').insertOne(modelAnalysisData);
    console.log(`✅ PR data for PR #${pull_request.number} inserted into MongoDB`);

    const sandbox_token = await mongoose.connection.db?.collection('auth_tokens').findOne({type: "sandbox"})
    if(!sandbox_token?.auth_token) {
      console.log("Unable to find sandbox token")
      return
    }
    // 🚀 Trigger Sandbox Analysis for PR
    console.log('=== TRIGGERING SANDBOX ANALYSIS FOR PR ===');
    
    try {

       const githubInstallation = await Github_Installation.findOne({installationId: installation.id})
       if(!githubInstallation?.userId) {
        console.log("Unable to find userid")
        return
       } 

      // Check if repository exists in our database and populate installation to get userId
      const githubRepo = await Github_Repository.findOne({ 
        fullName: repository.full_name 
      }).populate('github_installationId');

      if (githubRepo && githubRepo.trackGithubPullRequests) {
        console.log(`📊 Starting PR analysis for repository: ${repository.full_name}`);
        

       // Generate unique analysis ID for this PR analysis
        const repoUrl = `https://github.com/${repository.full_name}`;
        const branchForAnalysis = pull_request.head.ref;
        
        // Create PR-specific analysis prompt
        const prAnalysisPrompt = `Analyze this Pull Request for security vulnerabilities, code quality issues, and potential bugs.`

        // Initialize PR comment service
        const [owner, repo] = repository.full_name.split('/');
        const prCommentContext: PRCommentContext = {
          installationId: installation.id,
          owner,
          repo,
          pullNumber: pull_request.number
        };
        const prCommentService = new PRCommentService(prCommentContext);
        
        // Initialize parser state for streaming response parsing
        const parserState = createParserState();
        
        // Post initial analysis started comment
        // await prCommentService.postAnalysisStartedComment();

        // Define streaming callbacks for PR analysis
        const callbacks: StreamingCallbacks = {
          onStdout: async (data: string) => {
            console.log(`[PR-${pull_request.number}] ${data}`);
            
            // Parse the streaming data for PR comments
            const { prComments, state } = parseStreamingResponse(data, parserState);
            
            // Update parser state
            Object.assign(parserState, state);
            
            // Post any extracted PR comments
            if (prComments.length > 0) {
              console.log(`[PR-${pull_request.number}] Found ${prComments.length} PR comments to post`);
              const postedCount = await prCommentService.postComments(prComments);
              console.log(`[PR-${pull_request.number}] Posted ${postedCount}/${prComments.length} comments`);
            }
          },
          onStderr: async (data: string) => {
            console.error(`[PR-${pull_request.number}] ERROR: ${data}`);
            
            // Also parse stderr for potential PR comments (in case of mixed output)
            const { prComments, state } = parseStreamingResponse(data, parserState);
            Object.assign(parserState, state);
            
            if (prComments.length > 0) {
              await prCommentService.postComments(prComments);
            }
          },
          onProgress: async (message: string) => {
            console.log(`[PR-${pull_request.number}] PROGRESS: ${message}`);
          },
        };

        // Start analysis in background (don't await to avoid blocking webhook response)
        executeAnalysis(
          githubRepo._id as string,
          repoUrl,
          branchForAnalysis,
          githubInstallation.userId,
          "gemini-1.5-flash", // model
          prAnalysisPrompt,
          "pr_analysis", // analysisType
          callbacks,
          {pr_data_id: pr_data?.insertedId?.toString(), 
            auth_token: sandbox_token.auth_token,
            base_url: "https://redbird-polished-whippet.ngrok-free.app"
          },
        ).then(async (result) => {
          console.log(`✅ PR analysis completed for ${repository.full_name}#${pull_request.number}:`, result);
          
          // Process any remaining content in parser state
          const finalComments = finalizeParsing(parserState);
          if (finalComments.length > 0) {
            console.log(`[PR-${pull_request.number}] Processing ${finalComments.length} final comments`);
            await prCommentService.postComments(finalComments);
          }
          
          // Post analysis completion comment
          // await prCommentService.postAnalysisCompletedComment(result?.sandboxId || undefined);
          
          // Note: Persistence is now handled automatically by executeAnalysis function
        }).catch(async (error) => {
          console.error(`❌ PR analysis failed for ${repository.full_name}#${pull_request.number}:`, error);
          
          // Post error comment on PR
          await prCommentService.postAnalysisErrorComment(error.message || 'Unknown error occurred during analysis');
        });

        console.log(`🎯 PR analysis initiated for ${repository.full_name}#${pull_request.number}`);
      } else {
        console.log(`⏭️ Skipping analysis for ${repository.full_name} - repository not found or analysis not enabled`);
      }
    } catch (analysisError) {
      console.error('❌ Error triggering PR analysis:', analysisError);
      // Don't throw here to avoid breaking the webhook response
    }

    return modelAnalysisData;
    
  } catch (error) {
    console.error('Error handling pull_request.opened:', error);
    throw error;
  }
};
