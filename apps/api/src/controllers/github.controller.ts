// apps/api/src/controllers/github.controller.ts
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error.js";
import { generateInstallationToken } from "../lib/githubApp.js";
import { getUserGitHubInstallation, getOrganizationInstallationForRepo, getAllUserInstallations, checkIssueCreationPermission, checkPullRequestPermission } from "../queries/github.queries.js";
import { Octokit } from "@octokit/rest";
import { authenticateGithubRepo } from "../utils/authenticateGithubUrl.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import Team from "../models/team.model.js";

export const getRepoTree = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { github_repositoryId, teamId, branch } = req.query as { github_repositoryId: string, teamId: string, branch?: string };
 
    console.log("branch", branch);

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
    console.log("selectedBranch", selectedBranch);
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
    console.error("❌ Error getting repository tree:", error);
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
    console.error("❌ Error getting repository info:", error);
    next(
      new CustomError(error.message || "Failed to get repository info", 500)
    );
  }
};

export const createIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId, title, body, labels, assignees } = req.body;

    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
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

    console.log(`🐛 Creating issue in: ${owner}/${repo}`);
    console.log(`📝 Title: ${title}`);

    // Get GitHub token for authenticated user
    const userId = req.user?._id;
    let githubToken: string | undefined = process.env.GITHUB_TOKEN;

    if (userId) {
      try {
        console.log("🔑 Generating GitHub installation token...");
        console.log(`🎯 Target repository: ${owner}/${repo}`);
        console.log(`👤 User ID: ${userId}`);
        
        // Debug: Check all installations for this user
        const allInstallations = await getAllUserInstallations(userId);
        console.log("📋 All installations found:", allInstallations);
        
        // First try to get user's personal installation
        let installation;
        try {
          installation = await getUserGitHubInstallation(userId, owner);
          console.log("✅ Found personal installation:", installation.installationId);
        } catch (error) {
          console.log("⚠️ No personal GitHub installation found, checking organization installations...");
        }

        // If no personal installation, check if user has access to organization installations
        if (!installation) {
          // Check if the target repository belongs to an organization where user has access
          const orgInstallation = await getOrganizationInstallationForRepo(owner, repo, userId);
          if (orgInstallation) {
            installation = orgInstallation;
            console.log(`✅ Found organization installation for ${owner}/${repo}:`, orgInstallation.installationId);
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
          console.log("✅ GitHub token generated successfully");
        } else {
          console.log("⚠️ No GitHub installation found for user or organization");
        }
      } catch (error) {
        console.log(
          "⚠️ Could not generate GitHub token, using fallback:",
          error
        );
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

    console.log("📤 Creating issue with data:", issueData);

    const { data: issue } = await octokit.issues.create(issueData);

    console.log(`✅ Issue created successfully! Issue #${issue.number}`);

    res.json({
      success: true,
      data: {
        issue_number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        labels: issue.labels,
        assignees: issue.assignees,
        repository: {
          owner,
          repo,
          full_name: `${owner}/${repo}`,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating issue:", error);

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

export const getBranches = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId, teamId } = req.query as { github_repositoryId: string, teamId: string };

    console.log("github_repositoryId", github_repositoryId);
    console.log("teamId", teamId);

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
    console.error("❌ Error getting repository branches:", error);
    next(new CustomError(error.message || "Failed to get repository branches", error.status || 500));
  }
};

export const createPullRequest = async (
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
      issueNumber 
    } = req.body;

    // Validate required fields
    if (!github_repositoryId || !filePath || !before || !after || !title) {
      throw new CustomError("repoUrl, filePath, before, after, and title are required", 400);
    }

    const github_repository = await Github_Repository.findById(github_repositoryId);
    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
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

    console.log(`🔀 Creating pull request in: ${owner}/${repo}`);
    console.log(`📁 File path: ${filePath}`);
    console.log(`📝 Title: ${title}`);

    // Get GitHub token for authenticated user
    const userId = req.user?._id;
    let githubToken: string | undefined = process.env.GITHUB_TOKEN;

    if (userId) {
      try {
        console.log("🔑 Generating GitHub installation token...");
        
        // First try to get user's personal installation
        let installation;
        try {
          installation = await getUserGitHubInstallation(userId, owner);
        } catch (error) {
          console.log("⚠️ No personal GitHub installation found, checking organization installations...");
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
          console.log("✅ GitHub token generated successfully");
        } else {
          console.log("⚠️ No GitHub installation found for user or organization");
        }
      } catch (error) {
        console.log(
          "⚠️ Could not generate GitHub token, using fallback:",
          error
        );
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
    console.log(`🌿 Default branch: ${defaultBranch}`);

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
    console.log(`📋 Base commit SHA: ${baseSha.substring(0, 8)}...`);

    // Create a new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: baseSha,
    });
    console.log(`✅ Created new branch: ${newBranchName}`);

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
      console.log(`📄 Current file content retrieved (${currentContent.length} characters)`);
    } catch (error: any) {
      if (error.status === 404) {
        throw new CustomError(`File ${filePath} not found in the repository`, 404);
      }
      throw error;
    }

    // Check if the 'before' content exists in the file
    if (!currentContent.includes(before)) {
      throw new CustomError(
        `The specified 'before' content was not found in the file ${filePath}`,
        400
      );
    }

    // Replace the content
    const newContent = currentContent.replace(before, after);
    console.log(`🔄 Content replacement completed`);

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
    console.log(`✅ File updated and committed`);

    // Create pull request body
    let prBody = body || `This pull request updates \`${filePath}\` with the following changes:\n\n`;
    prBody += `**Changes made:**\n`;
    prBody += `- Replaced: \`${before.substring(0, 100)}${before.length > 100 ? '...' : ''}\`\n`;
    prBody += `- With: \`${after.substring(0, 100)}${after.length > 100 ? '...' : ''}\`\n\n`;
    
    // Link to issue if provided
    if (issueNumber) {
      prBody += `**Related Issue:** #${issueNumber}\n\n`;
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

    console.log(`✅ Pull request created successfully! PR #${pullRequest.number}`);

    res.json({
      success: true,
      data: {
        pull_request_number: pullRequest.number,
        title: pullRequest.title,
        body: pullRequest.body,
        state: pullRequest.state,
        url: pullRequest.html_url,
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
        issue_number: issueNumber || null,
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating pull request:", error);

    if (error.status === 404) {
      next(new CustomError("Repository or file not found", 404));
    } else if (error.status === 401) {
      next(new CustomError("GitHub authentication failed", 401));
    } else if (error.status === 403) {
      next(new CustomError("Repository access forbidden", 403));
    } else if (error.status === 422) {
      next(new CustomError("Invalid pull request data or repository configuration", 422));
    } else {
      next(
        new CustomError(error.message || "Failed to create pull request", 500)
      );
    }
  }
};
