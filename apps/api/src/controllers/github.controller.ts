// apps/api/src/controllers/github.controller.ts
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error.js";
import { generateInstallationToken } from "../lib/githubApp.js";
import { getUserGitHubInstallation, getOrganizationInstallationForRepo, getAllUserInstallations, checkIssueCreationPermission, checkPullRequestPermission } from "../queries/github.queries.js";
import { Octokit } from "@octokit/rest";
import { authenticateGithubRepo } from "../utils/authenticateGithubUrl.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import GithubIssue from "../models/github_issue.model.js";
import GithubPullRequest from "../models/github_pull_request.model.js";
import Team from "../models/team.model.js";
import { logger } from "../utils/logger.js";
import { randomUUID } from "crypto";
import { Github_Installation } from "../models/github_installations.model.js";

export const getRepoTree = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { github_repositoryId, teamId: queryTeamId, branch } = req.query as { github_repositoryId: string, teamId: string, branch?: string };
    
    // Use teamId from query or fallback to header context
    const teamId = req.team?.id;
    console.log(teamId, "here is team Id")
 
    logger.debug("Getting repo tree", { github_repositoryId, teamId, branch });

    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }
    
    const repoUrl = `https://github.com/${github_repository.fullName}`;

    let userId = req.user?._id;
    if (teamId && teamId !== 'null') {
      const team = await Team.findById(teamId);
      if (!team) {
        return next(new CustomError("Team not found", 404));
      }
      userId = team.ownerId;
    }

    if (!repoUrl) {
      throw new CustomError("Repository URL is required", 400);
    }

    // ✅ Authenticate repo first
    const authResult = await authenticateGithubRepo(repoUrl, userId);

    if (!authResult.success) {
      throw new CustomError(authResult.message, 401);
    }

    const { repoUrl: authenticatedRepoUrl, usedToken } = authResult;

    // Extract owner/repo again (safe after auth)
    const match = decodeURIComponent(repoUrl).match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (!match) {
      throw new CustomError("Invalid GitHub repository URL", 400);
    }
    const [, owner, repo] = match;

    // If we generated a token, Octokit should use it
    const githubToken = usedToken 
      ? authenticatedRepoUrl.match(/x-access-token:([^@]+)@/)?.[1]
      : process.env.GITHUB_TOKEN;

    const octokit = new Octokit(githubToken ? { auth: githubToken } : {});

    // ✅ Use the branch parameter or default to 'main'
    const selectedBranch = branch || github_repository.defaultBranch || 'main';
    logger.debug("Selected branch for repo tree", { selectedBranch, defaultBranch: github_repository.defaultBranch });
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${selectedBranch}` });
    const commitSha = ref.object.sha;

    const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: commitSha });
    const treeSha = commit.tree.sha;

    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "true",
    });

    // Format output
    const treeData = tree.tree.map(item => ({
      path: item.path,
      type: item.type,
      size: item.size || 0,
      sha: item.sha,
      url: item.url,
    }));

    res.json({
      success: true,
      data: { repository: { owner, repo, url: repoUrl }, tree: treeData }
    });

  } catch (error: any) {
    logger.error("Error getting repository tree", { 
      error: error instanceof Error ? error.message : error,
      owner: req.params.owner,
      repo: req.params.repo 
    });
    next(new CustomError(error.message || "Failed to get repository tree", error.status || 500));
  }
};

export const getRepoInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId } = req.body;

    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

    const repoUrl = `https://github.com/${github_repository.fullName}`;
    const userId = req.user?._id;

    if (!repoUrl) {
      throw new CustomError("Repository URL is required", 400);
    }

    // ✅ Authenticate repo first
    const authResult = await authenticateGithubRepo(repoUrl, userId);

    if (!authResult.success) {
      throw new CustomError(authResult.message, 401);
    }

    const { repoUrl: authenticatedRepoUrl, usedToken } = authResult;


    const match = decodeURIComponent(repoUrl).match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (!match) {
      throw new CustomError("Invalid GitHub repository URL", 400);
    }
    const [, owner, repo] = match;

    // If we generated a token, Octokit should use it
    let githubToken = usedToken 
      ? authenticatedRepoUrl.match(/x-access-token:([^@]+)@/)?.[1]
      : process.env.GITHUB_TOKEN;

    const octokit = new Octokit(githubToken ? { auth: githubToken } : {});

    // Get repository information
    const { data: repoInfo } = await octokit.repos.get({
      owner,
      repo,
    });

    res.json({
      success: true,
      data: {
        name: repoInfo.name,
        full_name: repoInfo.full_name,
        description: repoInfo.description,
        language: repoInfo.language,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        watchers: repoInfo.watchers_count,
        open_issues: repoInfo.open_issues_count,
        size: repoInfo.size,
        default_branch: repoInfo.default_branch,
        created_at: repoInfo.created_at,
        updated_at: repoInfo.updated_at,
        pushed_at: repoInfo.pushed_at,
        private: repoInfo.private,
        url: repoInfo.html_url,
        clone_url: repoInfo.clone_url,
        ssh_url: repoInfo.ssh_url,
      },
    });
  } catch (error: any) {
    logger.error("Error getting repository info", { 
      error: error instanceof Error ? error.message : error,
      owner: req.params.owner,
      repo: req.params.repo 
    });
    next(
      new CustomError(error.message || "Failed to get repository info", 500)
    );
  }
};

export const openIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId, analysisId, title, body, labels, assignees, segmentIssueId } = req.body;

    // Validate required fields
    if (!github_repositoryId || !title || !segmentIssueId) {
      throw new CustomError("github_repositoryId, title, and segmentIssueId are required", 400);
    }

    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError("User authentication required", 401);
    }

    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

    let github_issue = await GithubIssue.findOne({issueId: segmentIssueId});
    
    // If issue doesn't exist, create a new one
    if (!github_issue) {
      logger.info("Creating new GitHub issue record", { segmentIssueId, title, userId });
      
      github_issue = new GithubIssue({
        issueId: segmentIssueId,
        title: title,
        body: body || "",
        state: 'draft',
        labels: labels || [],
        assignees: assignees || [],
        createdBy: userId,
        github_repositoryId: github_repositoryId,
        analysisId,
        repository: {
          owner: github_repository.fullName.split('/')[0],
          repo: github_repository.fullName.split('/')[1],
          fullName: github_repository.fullName,
        },
        githubCreatedAt: new Date(),
        githubUpdatedAt: new Date(),
      });
      
      await github_issue.save();
      logger.info("New GitHub issue record created", { issueId: segmentIssueId });
    } else if (github_issue.state === "open") {
      return next(new CustomError("Github issue is already open", 400));
    }

    const repoUrl = `https://github.com/${github_repository.fullName}`;

    // Parse GitHub URL to extract owner and repo
    const githubUrlMatch = repoUrl.match(
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
    );
    if (!githubUrlMatch) {
      throw new CustomError("Invalid GitHub repository URL", 400);
    }

    const [, owner, repo] = githubUrlMatch;

    logger.info("Creating GitHub issue", { owner, repo, title });

    // Get GitHub token for authenticated user
    let githubToken: string | undefined = process.env.GITHUB_TOKEN;

    if (userId) {
      try {
        logger.debug("Generating GitHub installation token", { owner, repo, userId });
        
        // Debug: Check all installations for this user
        const allInstallations = await getAllUserInstallations(userId);
        logger.debug("All installations found", { 
          userCount: allInstallations.userInstallations.length, 
          orgCount: allInstallations.orgInstallations.length,
          installations: allInstallations 
        });
        
        // First try to get user's personal installation
        let installation;
        try {
          installation = await getUserGitHubInstallation(userId, owner);
          logger.debug("Found personal installation", { installationId: installation.installationId });
        } catch (error) {
          logger.debug("No personal GitHub installation found, checking organization installations");
        }

        // If no personal installation, check if user has access to organization installations
        if (!installation) {
          // Check if the target repository belongs to an organization where user has access
          const orgInstallation = await getOrganizationInstallationForRepo(owner, repo, userId);
          if (orgInstallation) {
            installation = orgInstallation;
            logger.debug("Found organization installation", { owner, repo, installationId: orgInstallation.installationId });
          }
        }

        if (installation) {
          // Check if the installation has permission to create issues
          const hasPermission = checkIssueCreationPermission(installation);
          if (!hasPermission) {
            throw new CustomError(
              "GitHub App installation does not have permission to create issues. Required permission: 'issues: write' or 'issues: admin'",
              403
            );
          }
          
          githubToken = await generateInstallationToken(
            installation.installationId
          );
          logger.debug("GitHub token generated successfully");
        } else {
          logger.warn("No GitHub installation found for user or organization", { userId, owner, repo });
        }
      } catch (error) {
        logger.warn("Could not generate GitHub token, using fallback", { error: error instanceof Error ? error.message : error });
      }
    }

    // GitHub token is required for creating issues
    if (!githubToken) {
      throw new CustomError(
        "GitHub authentication required to create issues",
        401
      );
    }

    // Import Octokit dynamically
    const octokit = new Octokit({ auth: githubToken });

    // Create the issue
    const issueData: any = {
      owner,
      repo,
      title,
      body: body || "",
    };

    // Add optional fields if provided
    if (labels && Array.isArray(labels) && labels.length > 0) {
      issueData.labels = labels;
    }

    if (assignees && Array.isArray(assignees) && assignees.length > 0) {
      issueData.assignees = assignees;
    }

    logger.debug("Creating issue with data", { issueData });

    const { data: issue } = await octokit.issues.create(issueData);

    logger.info("Issue created successfully", { issueNumber: issue.number, url: issue.html_url });

    // Save issue to database
    try {
      await github_issue.updateOne({
        $set: {
          state: issue.state as 'open' | 'closed',
          githubUrl: issue.html_url,
          githubId: issue.id,
          githubIssueNumber: issue.number,
          labels: issue.labels?.map((label: any) => typeof label === 'string' ? label : label.name) || [],
          assignees: issue.assignees?.map((assignee: any) => assignee.login) || [],
          githubUpdatedAt: new Date(issue.updated_at),
        }
      });

      logger.info("Issue saved to database", { issueId: segmentIssueId, issueNumber: issue.number });
    } catch (dbError) {
      logger.error("Failed to save issue to database", { 
        error: dbError instanceof Error ? dbError.message : dbError,
        issueNumber: issue.number,
        githubUrl: issue.html_url
      });
      // Don't fail the request if database save fails, as the GitHub issue was created successfully
    }

    res.json({
      success: true,
      data: {
        issueId: segmentIssueId,

        state: issue.state,
        html_url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        labels: issue.labels,
        assignees: issue.assignees,

      },
    });
  } catch (error: any) {
    logger.error("Error creating issue", { 
      error: error instanceof Error ? error.message : error,
      owner: req.params.owner,
      repo: req.params.repo,
      status: error.status 
    });

    if (error.status === 404) {
      next(new CustomError("Repository not found or access denied", 404));
    } else if (error.status === 401) {
      next(new CustomError("GitHub authentication failed", 401));
    } else if (error.status === 403) {
      next(new CustomError("Repository access forbidden", 403));
    } else if (error.status === 422) {
      next(new CustomError("Invalid issue data or repository configuration", 422));
    } else {
      next(
        new CustomError(error.message || "Failed to create issue", 500)
      );
    }
  }
};

export const saveGithubIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { 
      github_repositoryId, 
      analysisId,
      title, 
      body, 
      labels, 
      assignees, 
      segmentIssueId,
      repository 
    } = req.body;

    // Validate required fields
    if (!github_repositoryId || !title || !segmentIssueId) {
      throw new CustomError("github_repositoryId, title, and segmentIssueId are required", 400);
    }

    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError("User authentication required", 401);
    }

    logger.info("Saving GitHub issue to database", { segmentIssueId, title, userId });

    // Check if issue already exists
    const existingIssue = await GithubIssue.findOne({ issueId: segmentIssueId });
    if (existingIssue) {
      logger.debug("Issue already exists", { issueId: segmentIssueId });
      return res.json({
        success: true,
        data: existingIssue,
        message: "Issue already exists"
      });
    }

    // Get repository info
    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      throw new CustomError("Github repository not found", 404);
    }

    // Create new issue record
    const githubIssue = new GithubIssue({
      issueId: segmentIssueId,
      title: title,
      body: body || "",
      state: 'draft',
      labels: labels || [],
      assignees: assignees || [],
      createdBy: userId,
      github_repositoryId: github_repositoryId,
      analysisId: analysisId,
      repository: repository || {
        owner: github_repository.fullName.split('/')[0],
        repo: github_repository.fullName.split('/')[1],
        fullName: github_repository.fullName,
      },
      githubCreatedAt: new Date(),
      githubUpdatedAt: new Date(),
    });

    await githubIssue.save();
    logger.info("Issue saved to database successfully", { issueId: githubIssue._id, segmentIssueId });

    res.json({
      success: true,
      data: githubIssue,
      message: "Issue saved successfully"
    });

  } catch (error: any) {
    logger.error("Error saving GitHub issue", { 
      error: error instanceof Error ? error.message : error,
      segmentIssueId: req.body.segmentIssueId
    });
    next(new CustomError(error.message || "Failed to save GitHub issue", error.status || 500));
  }
};

export const savePatch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { 
      github_repositoryId, 
      title, 
      body, 
      labels, 
      assignees, 
      patchId,
      filePath,
      before,
      after,
      explanation,
      repository,
      segmentIssueId, 
      analysisId,
    } = req.body;

    // Validate required fields
    if (!github_repositoryId || !title || !patchId || !filePath || !before || !after) {
      throw new CustomError("github_repositoryId, title, patchId, filePath, before, and after are required", 400);
    }

    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError("User authentication required", 401);
    }

    logger.info("Saving patch to database", { patchId, title, filePath, userId });

    // Check if patch already exists
    const existingPatch = await GithubPullRequest.findOne({ patchId: patchId });
    if (existingPatch) {
      logger.debug("Patch already exists", { patchId });
      return res.json({
        success: true,
        data: existingPatch,
        message: "Patch already exists"
      });
    }

    // Get repository info
    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      throw new CustomError("Github repository not found", 404);
    }

    // Create new patch record
    const githubPullRequest = new GithubPullRequest({
      patchId: patchId,
      issueId: segmentIssueId,
      title: title,
      body: body || "",
      state: 'draft',
      labels: labels || [],
      assignees: assignees || [],
      createdBy: userId,
      github_repositoryId: github_repositoryId,
      analysisId,
      repository: repository || {
        owner: github_repository.fullName.split('/')[0],
        repo: github_repository.fullName.split('/')[1],
        fullName: github_repository.fullName,
      },
      patch: {
        filePath: filePath,
        before: before,
        after: after,
        explanation: explanation || "",
      },
      baseBranch: github_repository.defaultBranch || 'main',
    });

    await githubPullRequest.save();
    logger.info("Patch saved to database successfully", { patchId: githubPullRequest._id, segmentPatchId: patchId });

    res.json({
      success: true,
      data: githubPullRequest,
      message: "Patch saved successfully"
    });

  } catch (error: any) {
    logger.error("Error saving patch", { 
      error: error instanceof Error ? error.message : error,
      patchId: req.body.patchId
    });
    next(new CustomError(error.message || "Failed to save patch", error.status || 500));
  }
};

export const getGithubIssuesWithPullRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId, analysisId } = req.query as { 
      github_repositoryId: string; 
      analysisId?: string; 
    };

    // Validate required fields
    if (!github_repositoryId) {
      throw new CustomError("github_repositoryId is required", 400);
    }

    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError("User authentication required", 401);
    }

    logger.info("Getting GitHub issues with pull requests", { 
      github_repositoryId, 
      analysisId, 
      userId 
    });

    // Verify repository exists and user has access
    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      console.log("no github repo id")
      throw new CustomError("Github repository not found", 404);
    }

    // Build query filter
    const issueFilter: any = { 
      github_repositoryId: github_repositoryId,
      createdBy: userId 
    };
    
    if (analysisId) {
      issueFilter.analysisId = analysisId;
    }

    // Get GitHub issues
    const githubIssues = await GithubIssue.find(issueFilter)
      .sort({ createdAt: -1 })
      .lean();

    logger.debug("Found GitHub issues", { count: githubIssues.length });

    // Get associated pull requests for each issue
    const issuesWithPullRequests = await Promise.all(
      githubIssues.map(async (issue) => {
        const pullRequests = await GithubPullRequest.find({
          issueId: issue.issueId,
          github_repositoryId: github_repositoryId,
          createdBy: userId
        })
        .sort({ createdAt: -1 })
        .lean();

        return {
          ...issue,
          pullRequests: pullRequests || []
        };
      })
    );

    logger.info("Successfully retrieved issues with pull requests", { 
      issueCount: issuesWithPullRequests.length,
      totalPullRequests: issuesWithPullRequests.reduce((sum, issue) => sum + issue.pullRequests.length, 0)
    });

    console.log(issuesWithPullRequests)

    res.json({
      success: true,
      data: {
        repository: {
          id: github_repository._id,
          fullName: github_repository.fullName,
          owner: github_repository.fullName.split('/')[0],
          repo: github_repository.fullName.split('/')[1]
        },
        issues: issuesWithPullRequests
      }
    });

  } catch (error: any) {
    logger.error("Error getting GitHub issues with pull requests", { 
      error: error instanceof Error ? error.message : error,
      github_repositoryId: req.query.github_repositoryId,
      analysisId: req.query.analysisId
    });
    next(new CustomError(error.message || "Failed to get GitHub issues", error.status || 500));
  }
};

export const getBranches = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId, teamId: queryTeamId } = req.query as { github_repositoryId: string, teamId: string };
    
    // Use teamId from query or fallback to header context
    const teamId = queryTeamId || req.team?.id;

    logger.debug("Getting branches", { github_repositoryId, teamId });

    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

    const repoUrl = `https://github.com/${github_repository.fullName}`;

    let userId = req.user?._id;
    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team) {
        return next(new CustomError("Team not found", 404));
      }
      userId = team.ownerId;
    }

    if (!repoUrl) {
      throw new CustomError("Repository URL is required", 400);
    }

    // ✅ Authenticate repo first
    const authResult = await authenticateGithubRepo(repoUrl, userId);

    if (!authResult.success) {
      throw new CustomError(authResult.message, 401);
    }

    const { repoUrl: authenticatedRepoUrl, usedToken } = authResult;

    // Extract owner/repo again (safe after auth)
    const match = decodeURIComponent(repoUrl).match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (!match) {
      throw new CustomError("Invalid GitHub repository URL", 400);
    }
    const [, owner, repo] = match;

    // If we generated a token, Octokit should use it
    const githubToken = usedToken 
      ? authenticatedRepoUrl.match(/x-access-token:([^@]+)@/)?.[1]
      : process.env.GITHUB_TOKEN;

    const octokit = new Octokit(githubToken ? { auth: githubToken } : {});

    // Get all branches
    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100, // Get up to 100 branches
    });

    // Format the branches data
    const branchesData = branches.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url,
      },
      protected: branch.protected,
    }));

    res.json({
      success: true,
      data: branchesData
    });

  } catch (error: any) {
    logger.error("Error getting repository branches", { 
      error: error instanceof Error ? error.message : error,
      owner: req.params.owner,
      repo: req.params.repo 
    });
    next(new CustomError(error.message || "Failed to get repository branches", error.status || 500));
  }
};

export const openPullRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { 
      github_repositoryId, 
      filePath, 
      before, 
      after, 
      title, 
      body, 
      branchName,
      issueId,
      patchId 
    } = req.body;

    // Get user ID for authentication
    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError("User authentication required", 401);
    }

    // Validate required fields
    if (!github_repositoryId || !filePath || !before || !after || !title) {
      throw new CustomError("repoUrl, filePath, before, after, and title are required", 400);
    }

    

    console.log(before, issueId)
    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

       // Check if pull request already exists in database
    let githubPullRequest = null;
    if (patchId) {
      githubPullRequest = await GithubPullRequest.findOne({ patchId: patchId });
      
      if (githubPullRequest) {
        logger.info("Found existing pull request in database", { 
          patchId, 
          prId: githubPullRequest._id,
          state: githubPullRequest.state,
          githubUrl: githubPullRequest.githubUrl 
        });
        
        // If PR already exists on GitHub, return the existing data
        if (githubPullRequest.githubUrl && githubPullRequest.githubPullRequestNumber) {
          logger.info("Pull request already exists on GitHub", { 
            githubUrl: githubPullRequest.githubUrl,
            prNumber: githubPullRequest.githubPullRequestNumber 
          });
          
          return res.json({
            success: true,
            data: {
              pull_request_number: githubPullRequest.githubPullRequestNumber,
              title: githubPullRequest.title,
              body: githubPullRequest.body,
              state: githubPullRequest.state,
              url: githubPullRequest.githubUrl,
              created_at: githubPullRequest.githubCreatedAt,
              updated_at: githubPullRequest.githubUpdatedAt,
              branch: {
                head: githubPullRequest.branchName,
                base: githubPullRequest.baseBranch,
              },
              file_changes: {
                file_path: githubPullRequest.patch.filePath,
                before_length: githubPullRequest.patch.before.length,
                after_length: githubPullRequest.patch.after.length,
              },
              repository: {
                owner: githubPullRequest.repository.owner,
                repo: githubPullRequest.repository.repo,
                full_name: githubPullRequest.repository.fullName,
              },
              issueId: githubPullRequest.issueId || null,
            },
            message: "Pull request already exists"
          });
        }
      } else {
        // Create new pull request record in database
        logger.info("Creating new pull request record in database", { patchId, title, filePath, userId });
        
        githubPullRequest = new GithubPullRequest({
          patchId: patchId,
          issueId: issueId,
          title: title,
          body: body || "",
          state: 'draft',
          createdBy: userId,
          github_repositoryId: github_repositoryId,
          repository: {
            owner: github_repository.fullName.split('/')[0],
            repo: github_repository.fullName.split('/')[1],
            fullName: github_repository.fullName,
          },
          patch: {
            filePath: filePath,
            before: before,
            after: after,
            explanation: body || "",
          },
          baseBranch: github_repository.defaultBranch || 'main',
        });

        await githubPullRequest.save();
        logger.info("Pull request record created in database", { 
          prId: githubPullRequest._id, 
          patchId: githubPullRequest.patchId 
        });
      }
    }

    if(githubPullRequest.state !== 'draft') {
      return next(new CustomError("Pull request is not in draft state", 400));
    }

    // Look up associated issue if issueNumber is provided
    let associatedIssue = null;
    if (issueId) {
      try {
        // Look up the issue by issueId (which corresponds to issueNumber in the request)
        associatedIssue = await GithubIssue.findOne({
          issueId: issueId,
        });
        
        if (associatedIssue) {
          logger.info("Found associated issue", { 
            issueId: associatedIssue.issueId, 
            issueState: associatedIssue.state,
            githubIssueNumber: associatedIssue.issueNumber 
          });
        } else {
          logger.warn("Associated issue not found in database", { issueId, github_repositoryId });
        }
      } catch (error) {
        logger.error("Error looking up associated issue", { 
          error: error instanceof Error ? error.message : error,
          issueId,
          github_repositoryId 
        });
        // Continue with PR creation even if issue lookup fails
      }
    }

    const repoUrl = `https://github.com/${github_repository.fullName}`;

    // Parse GitHub URL to extract owner and repo
    const githubUrlMatch = repoUrl.match(
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
    );

    if (!githubUrlMatch) {
      throw new CustomError("Invalid GitHub repository URL", 400);
    }

    const [, owner, repo] = githubUrlMatch;

    logger.info("Creating pull request", { owner, repo, filePath, title });

    // Get GitHub token for authenticated user
    let githubToken: string | undefined = process.env.GITHUB_TOKEN;

    if (userId) {
      try {
        logger.debug("Generating GitHub installation token for PR");
        
        // First try to get user's personal installation
        let installation;
        try {
          installation = await getUserGitHubInstallation(userId, owner);
        } catch (error) {
          logger.debug("No personal GitHub installation found, checking organization installations");
        }

        // If no personal installation, check if user has access to organization installations
        if (!installation) {
          const orgInstallation = await getOrganizationInstallationForRepo(owner, repo, userId);
          if (orgInstallation) {
            installation = orgInstallation;
          }
        }

        if (installation) {
          // Check if the installation has permission to create pull requests
          const hasPermission = checkPullRequestPermission(installation);
          if (!hasPermission) {
            throw new CustomError(
              "GitHub App installation does not have permission to create pull requests. Required permission: 'contents: write'",
              403
            );
          }
          
          githubToken = await generateInstallationToken(
            installation.installationId
          );
          logger.debug("GitHub token generated successfully for PR");
        } else {
          logger.warn("No GitHub installation found for user or organization", { userId, owner, repo });
        }
      } catch (error) {
        logger.warn("Could not generate GitHub token for PR, using fallback", { error: error instanceof Error ? error.message : error });
      }
    }


    // GitHub token is required for creating pull requests
    if (!githubToken) {
      throw new CustomError(
        "GitHub authentication required to create pull requests",
        401
      );
    }

    // Import Octokit dynamically
    const octokit = new Octokit({ auth: githubToken });

    // Get the default branch
    const { data: repoInfo } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoInfo.default_branch;
    logger.debug("Retrieved default branch", { defaultBranch, owner, repo });

    // Generate branch name if not provided
    const newBranchName = branchName || `fix/${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log(`🌿 New branch name: ${newBranchName}`);

    // Get the latest commit SHA from the default branch
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const baseSha = ref.object.sha;
    logger.debug("Retrieved base commit SHA", { baseSha: baseSha.substring(0, 8), owner, repo });

    // Create a new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: baseSha,
    });
    logger.debug("Created new branch", { newBranchName, baseSha: baseSha.substring(0, 8) });

    // Get the current file content
    let currentContent: string;
    let currentSha: string;
    
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: defaultBranch,
      });
      
      if (Array.isArray(fileData)) {
        throw new CustomError(`Path ${filePath} is a directory, not a file`, 400);
      }
      
      // Check if it's a file (not a symlink or submodule)
      if (fileData.type !== 'file') {
        throw new CustomError(`Path ${filePath} is not a regular file (type: ${fileData.type})`, 400);
      }
      
      currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
      currentSha = fileData.sha;
      logger.debug("Current file content retrieved", { filePath, contentLength: currentContent.length, sha: currentSha.substring(0, 8) });
    } catch (error: any) {
      if (error.status === 404) {
        throw new CustomError(`File ${filePath} not found in the repository`, 404);
      }
      throw error;
    }

    // Normalize whitespace for more flexible matching
    const normalizeWhitespace = (str: string) => {
      return str.replace(/\s+/g, ' ').trim();
    };

    const normalizedBefore = normalizeWhitespace(before);
    const normalizedCurrent = normalizeWhitespace(currentContent);

    // Check if the 'before' content exists in the file (with flexible whitespace matching)
    if (!normalizedCurrent.includes(normalizedBefore)) {
      // Try exact match as fallback
      if (!currentContent.includes(before)) {
        logger.error("Content matching failed", {
           filePath,
           beforeContentLength: before.length,
           currentContentLength: currentContent.length,
           beforePreview: before.substring(0, 200),
           currentPreview: currentContent.substring(0, 200),
           normalizedBeforePreview: normalizedBefore.substring(0, 200),
           normalizedCurrentPreview: normalizedCurrent.substring(0, 200),
           beforeLines: before.split('\n').length,
           currentLines: currentContent.split('\n').length
         });
        
        throw new CustomError(
          `The specified 'before' content was not found in the file ${filePath}. Please check the content formatting and whitespace.`,
          400
        );
      }
    }

    // Replace the content (try normalized match first, then exact match)
    let newContent: string;
    if (normalizedCurrent.includes(normalizedBefore)) {
      // For normalized matching, we need to find the actual content in the original file
      // This is more complex, so let's use a different approach
      const beforeLines = before.split('\n').map((line: any) => line.trim()).filter((line: any) => line.length > 0);
      const currentLines = currentContent.split('\n');
      
      // Find the starting line that matches the first non-empty line of 'before'
      let startIndex = -1;
      for (let i = 0; i < currentLines.length; i++) {
        if (currentLines[i].trim() === beforeLines[0]) {
          startIndex = i;
          break;
        }
      }
      
      if (startIndex !== -1) {
        // Replace line by line
        const beforeLinesCount = before.split('\n').length;
        const afterLines = after.split('\n');
        
        newContent = [
          ...currentLines.slice(0, startIndex),
          ...afterLines,
          ...currentLines.slice(startIndex + beforeLinesCount)
        ].join('\n');
      } else {
        // Fallback to exact replacement
        newContent = currentContent.replace(before, after);
      }
    } else {
      // Use exact replacement
      newContent = currentContent.replace(before, after);
    }
    logger.debug("Content replacement completed", { filePath, beforeLength: before.length, afterLength: after.length });

    // Create the commit
    const commitMessage = title;
    const { data: commit } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(newContent).toString('base64'),
      sha: currentSha,
      branch: newBranchName,
    });
    logger.debug("File updated and committed", { filePath, commitSha: commit.commit.sha?.substring(0, 8), branch: newBranchName });

    // Create pull request body
    let prBody = body || `This pull request updates \`${filePath}\` with the following changes:\n\n`;
    prBody += `**Changes made:**\n`;
    prBody += `- Replaced: \`${before.substring(0, 100)}${before.length > 100 ? '...' : ''}\`\n`;
    prBody += `- With: \`${after.substring(0, 100)}${after.length > 100 ? '...' : ''}\`\n\n`;
    
    // Link to issue if it exists and is open
    if (associatedIssue && associatedIssue.state === 'open') {
      prBody += `**Closes:** #${associatedIssue.githubIssueNumber}\n\n`;
      logger.info("Linking PR to open issue", { 
        issueNumber: associatedIssue.githubIssueNumber, 
        issueId: associatedIssue.issueId 
      });
    } else if (issueId) {
      // If issueNumber provided but no open issue found, just reference it
      prBody += `**Related Issue:** #${issueId}\n\n`;
    }
    
    prBody += `**File:** \`${filePath}\`\n`;
    prBody += `**Branch:** \`${newBranchName}\` → \`${defaultBranch}\``;

    // Create the pull request
    const { data: pullRequest } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body: prBody,
      head: newBranchName,
      base: defaultBranch,
    });

    logger.info("Pull request created successfully", { 
      pullRequestNumber: pullRequest.number, 
      title: pullRequest.title,
      url: pullRequest.html_url,
      owner,
      repo
    });

    // Update the database record with GitHub PR details
    if (githubPullRequest) {
      try {
        githubPullRequest.githubUrl = pullRequest.html_url;
        githubPullRequest.githubPullRequestNumber = pullRequest.number;
        githubPullRequest.githubId = pullRequest.id;
        githubPullRequest.state = pullRequest.state as 'draft' | 'open' | 'closed' | 'merged';
        githubPullRequest.branchName = newBranchName;
        githubPullRequest.baseBranch = defaultBranch;
        githubPullRequest.githubCreatedAt = new Date(pullRequest.created_at);
        githubPullRequest.githubUpdatedAt = new Date(pullRequest.updated_at);

        await githubPullRequest.save();
        
        logger.info("Database record updated with GitHub PR details", {
          prId: githubPullRequest._id,
          githubPrNumber: pullRequest.number,
          githubUrl: pullRequest.html_url,
          state: pullRequest.state
        });
      } catch (dbError) {
        logger.error("Failed to update database with GitHub PR details", { 
          error: dbError instanceof Error ? dbError.message : dbError,
          prId: githubPullRequest._id,
          githubPrNumber: pullRequest.number
        });
        // Don't fail the request if database update fails
      }
    }

    res.json({
      success: true,
      data: {
        pull_request_number: pullRequest.number,
        title: pullRequest.title,
        body: pullRequest.body,
        state: pullRequest.state,
        html_url: pullRequest.html_url,
        created_at: pullRequest.created_at,
        updated_at: pullRequest.updated_at,
        branch: {
          head: newBranchName,
          base: defaultBranch,
        },
        file_changes: {
          file_path: filePath,
          before_length: before.length,
          after_length: after.length,
        },
        repository: {
          owner,
          repo,
          full_name: `${owner}/${repo}`,
        },
        issueId: issueId || null,
      },
    });
  } catch (error: any) {
    logger.error("Error creating pull request", { error: error instanceof Error ? error.message : error });
   console.log(error)
}};

export const getIssueStates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId, analysisId, issueIds } = req.body;

    // Validate required fields
    if (!github_repositoryId || !issueIds || !Array.isArray(issueIds)) {
      throw new CustomError("github_repositoryId and issueIds array are required", 400);
    }

    // Limit the number of issueIds to prevent performance issues
    const MAX_ISSUE_IDS = 100;
    if (issueIds.length > MAX_ISSUE_IDS) {
      throw new CustomError(`Too many issueIds. Maximum allowed: ${MAX_ISSUE_IDS}`, 400);
    }

    const userId = req.user?._id;
    if (!userId) {
      throw new CustomError("User authentication required", 401);
    }

    logger.info("Getting GitHub issue states", { 
      github_repositoryId, 
      analysisId, 
      issueIds: issueIds.length,
      userId 
    });

    // Verify repository exists and user has access
    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      throw new CustomError("Github repository not found", 404);
    }

    // Build query filter
    const issueFilter: any = { 
      github_repositoryId: github_repositoryId,
      createdBy: userId,
      issueId: { $in: issueIds }
    };
    
    if (analysisId) {
      issueFilter.analysisId = analysisId;
    }

    // Get GitHub issues with only necessary fields for performance
    const githubIssues = await GithubIssue.find(issueFilter)
      .select('issueId state githubUrl githubId issueNumber')
      .lean();

    logger.debug("Found GitHub issues", { count: githubIssues.length });

    // Create a map for efficient lookup
    const issueStatesMap: Record<string, {
      state: string;
      githubUrl?: string;
      githubId?: number;
      issueNumber?: number;
    }> = {};

    githubIssues.forEach(issue => {
      if (issue.issueId) {
        issueStatesMap[issue.issueId] = {
          state: issue.state,
          githubUrl: issue.githubUrl,
          githubId: issue.githubId,
          issueNumber: issue.issueNumber
        };
      }
    });

    // Fill in missing issueIds with default state
    issueIds.forEach((issueId: string) => {
      if (!issueStatesMap[issueId]) {
        issueStatesMap[issueId] = {
          state: 'draft'
        };
      }
    });

    logger.info("Successfully retrieved issue states", { 
      requestedCount: issueIds.length,
      foundCount: githubIssues.length,
      totalStates: Object.keys(issueStatesMap).length
    });

    res.json({
      success: true,
      data: {
        repository: {
          id: github_repository._id,
          fullName: github_repository.fullName
        },
        issueStates: issueStatesMap
      }
    });

  } catch (error: any) {
    logger.error("Error getting GitHub issue states", { 
      error: error instanceof Error ? error.message : error,
      github_repositoryId: req.body.github_repositoryId,
      analysisId: req.body.analysisId
    });
    next(new CustomError(error.message || "Failed to get GitHub issue states", error.status || 500));
  }
};

export const syncRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(new CustomError("User not authenticated", 401));
    }

    logger.debug("Syncing repositories for all user installations", { userId });

    // Find all GitHub installations for this user
    const installations = await Github_Installation.find({ userId: userId });

    if (installations.length === 0) {
      return res.json({
        success: true,
        message: "No GitHub installations found for user",
        data: {
          updated: 0,
          created: 0,
          removed: 0,
          totalRepositories: 0,
          totalInstallations: 0,
          errors: []
        }
      });
    }

    logger.debug("Found installations", { 
      count: installations.length,
      installationIds: installations.map(i => i.installationId)
    });

    const overallSyncResults = {
      updated: 0,
      created: 0,
      removed: 0,
      totalRepositories: 0,
      totalInstallations: installations.length,
      errors: [] as string[]
    };

    // Process each installation
    for (const installation of installations) {
      try {
        logger.debug("Processing installation", { installationId: installation.installationId });

        // Get installation token and create Octokit instance
        const token = await generateInstallationToken(installation.installationId);
        const octokit = new Octokit({ auth: token });

        // Fetch all repositories from GitHub for this installation with pagination
        let allRepositories: any[] = [];
        let page = 1;
        let hasMorePages = true;
        
        while (hasMorePages) {
          const { data: installationRepos } = await octokit.apps.listReposAccessibleToInstallation({
            per_page: 100, // Maximum per page
            page: page
          });

          allRepositories = allRepositories.concat(installationRepos.repositories);
          
          // Check if we have more pages
          hasMorePages = installationRepos.repositories.length === 100;
          page++;
          
          logger.debug("Fetched repositories page", { 
            page: page - 1,
            count: installationRepos.repositories.length,
            totalSoFar: allRepositories.length,
            totalCount: installationRepos.total_count,
            installationId: installation.installationId
          });
        }

        logger.debug("Fetched all repositories from GitHub", { 
          totalCount: allRepositories.length,
          installationId: installation.installationId
        });

        overallSyncResults.totalRepositories += allRepositories.length;

        // Process each repository
        for (const repo of allRepositories) {
          try {
            // Check if repository already exists in our database
            const existingRepo = await Github_Repository.findOne({ 
              repositoryId: repo.id 
            });

            const repoData = {
              github_installationId: installation._id,
              repositoryId: repo.id,
              fullName: repo.full_name,
              private: repo.private,
              defaultBranch: repo.default_branch || 'main'
            };

            if (existingRepo) {
              // Check if any fields have actually changed
              const hasChanges = 
                existingRepo.fullName !== repo.full_name ||
                existingRepo.private !== repo.private ||
                existingRepo.defaultBranch !== (repo.default_branch || 'main') ||
                existingRepo.github_installationId.toString() !== installation._id?.toString();

              if (hasChanges) {
                // Only update if something actually changed
                await Github_Repository.findByIdAndUpdate(
                  existingRepo._id,
                  {
                    fullName: repo.full_name,
                    private: repo.private,
                    defaultBranch: repo.default_branch || 'main',
                    github_installationId: installation._id
                  },
                  { new: true }
                );
                overallSyncResults.updated++;
                logger.debug("Updated repository (changes detected)", { 
                  repositoryId: repo.id, 
                  fullName: repo.full_name,
                  installationId: installation.installationId,
                  changes: {
                     fullName: existingRepo.fullName !== repo.full_name,
                     private: existingRepo.private !== repo.private,
                     defaultBranch: existingRepo.defaultBranch !== (repo.default_branch || 'main'),
                     installationId: existingRepo.github_installationId.toString() !== installation._id?.toString()
                   }
                });
              } else {
                logger.debug("Repository unchanged, skipping update", { 
                  repositoryId: repo.id, 
                  fullName: repo.full_name,
                  installationId: installation.installationId
                });
              }
            } else {
              // Create new repository
              const newRepo = new Github_Repository(repoData);
              await newRepo.save();
              overallSyncResults.created++;
              logger.debug("Created new repository", { 
                repositoryId: repo.id, 
                fullName: repo.full_name,
                installationId: installation.installationId
              });
            }
          } catch (repoError) {
            const errorMessage = `Failed to sync repository ${repo.full_name} (installation ${installation.installationId}): ${repoError instanceof Error ? repoError.message : repoError}`;
            overallSyncResults.errors.push(errorMessage);
            logger.error("Error syncing repository", { 
              repositoryId: repo.id, 
              fullName: repo.full_name, 
              installationId: installation.installationId,
              error: errorMessage 
            });
          }
        }

        // Remove repositories that are no longer accessible for this installation
        const currentRepoIds = allRepositories.map(repo => repo.id);
        const removedRepos = await Github_Repository.find({
          github_installationId: installation._id,
          repositoryId: { $nin: currentRepoIds }
        });

        if (removedRepos.length > 0) {
          overallSyncResults.removed += removedRepos.length;
          logger.info("Found inaccessible repositories for installation", { 
            installationId: installation.installationId,
            count: removedRepos.length,
            repositories: removedRepos.map(r => r.fullName)
          });

          // Uncomment to actually remove repositories
          await Github_Repository.deleteMany({
            github_installationId: installation._id,
            repositoryId: { $nin: currentRepoIds }
          });
        }

        logger.debug("Installation sync completed", { 
          installationId: installation.installationId,
          repositoriesProcessed: allRepositories.length
        });

      } catch (installationError) {
        const errorMessage = `Failed to sync installation ${installation.installationId}: ${installationError instanceof Error ? installationError.message : installationError}`;
        overallSyncResults.errors.push(errorMessage);
        logger.error("Error syncing installation", { 
          installationId: installation.installationId,
          error: errorMessage 
        });
      }
    }

    logger.info("All installations sync completed", { 
      userId,
      totalInstallations: overallSyncResults.totalInstallations,
      updated: overallSyncResults.updated, 
      created: overallSyncResults.created, 
      removed: overallSyncResults.removed,
      totalRepositories: overallSyncResults.totalRepositories,
      errors: overallSyncResults.errors.length 
    });

    res.json({
      success: true,
      message: `Repositories synchronized successfully across ${overallSyncResults.totalInstallations} installation(s)`,
      data: overallSyncResults
    });

  } catch (error: any) {
    logger.error("Error syncing repositories", { 
      error: error instanceof Error ? error.message : error,
      userId: req.user?._id
    });
    next(new CustomError("Failed to sync repositories", 500));
  }
};
