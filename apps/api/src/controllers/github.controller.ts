// apps/api/src/controllers/github.controller.ts
import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error.js";
import { generateInstallationToken } from "../lib/githubApp.js";
import { getUserGitHubInstallation, getOrganizationInstallationForRepo, getAllUserInstallations, checkIssueCreationPermission } from "../queries/github.queries.js";

export const getRepoTree = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { repoUrl } = req.query as { repoUrl: string };
    console.log({ repoUrl });

    if (!repoUrl) {
      throw new CustomError("Repository URL is required", 400);
    }

    // Parse GitHub URL to extract owner and repo
    const githubUrlMatch = decodeURIComponent(repoUrl).match(
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
    );
    if (!githubUrlMatch) {
      throw new CustomError("Invalid GitHub repository URL", 400);
    }

    const [, owner, repo] = githubUrlMatch;

    console.log(`🌳 Getting repository tree for: ${owner}/${repo}`);

    // Get GitHub token for authenticated user or use fallback
    const userId = req.user?._id;
    let githubToken: string | undefined = process.env.GITHUB_TOKEN; // Fallback to env token

    if (userId) {
      try {
        console.log("🔑 Generating GitHub installation token...");
        const installation = await getUserGitHubInstallation(userId);
        githubToken = await generateInstallationToken(
          installation.installationId
        );
        console.log("✅ GitHub token generated successfully");
      } catch (error) {
        console.log(
          "⚠️ Could not generate GitHub token, using fallback:",
          error
        );
      }
    }

    // For public repositories, we can use unauthenticated requests
    if (!githubToken) {
      console.log(
        "🌐 Using unauthenticated requests for public repository access"
      );
    }

    // Import Octokit dynamically
    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit(githubToken ? { auth: githubToken } : {});

    // 1. Get default branch commit SHA
    console.log("📋 Getting default branch...");
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main", // Try main first
    });

    const commitSha = ref.object.sha;
    console.log(`✅ Found commit SHA: ${commitSha.substring(0, 8)}...`);

    // 2. Get commit to find tree_sha
    console.log("🌲 Getting commit tree...");
    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: commitSha,
    });

    const treeSha = commit.tree.sha;
    console.log(`✅ Found tree SHA: ${treeSha.substring(0, 8)}...`);

    // 3. Get full tree (recursive)
    console.log("📁 Getting full repository tree...");
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "true",
    });

    // Process and format the tree data
    const treeData = tree.tree.map((item) => ({
      path: item.path,
      type: item.type, // "tree" = folder, "blob" = file
      size: item.size || 0,
      sha: item.sha,
      url: item.url,
    }));

    // Group by file types and calculate statistics
    const stats = {
      total_files: treeData.filter((item) => item.type === "blob").length,
      total_folders: treeData.filter((item) => item.type === "tree").length,
      total_items: treeData.length,
      file_extensions: {} as Record<string, number>,
    };

    // Count file extensions
    treeData.forEach((item) => {
      if (item.type === "blob" && item.path) {
        const extension =
          item.path.split(".").pop()?.toLowerCase() || "no-extension";
        stats.file_extensions[extension] =
          (stats.file_extensions[extension] || 0) + 1;
      }
    });

    console.log(`✅ Repository tree retrieved successfully`);
    console.log(
      `📊 Stats: ${stats.total_files} files, ${stats.total_folders} folders`
    );

    res.json({
      success: true,
      data: {
        repository: {
          owner,
          repo,
          url: repoUrl,
        },
        tree: treeData,
        statistics: stats,
        commit: {
          sha: commitSha,
          message: commit.message,
          author: commit.author,
          date: commit.author?.date,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error getting repository tree:", error);

    if (error.status === 404) {
      next(new CustomError("Repository not found or access denied", 404));
    } else if (error.status === 401) {
      next(new CustomError("GitHub authentication failed", 401));
    } else if (error.status === 403) {
      next(new CustomError("Repository access forbidden", 403));
    } else {
      next(
        new CustomError(error.message || "Failed to get repository tree", 500)
      );
    }
  }
};

export const getRepoInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      throw new CustomError("Repository URL is required", 400);
    }

    // Parse GitHub URL
    const githubUrlMatch = repoUrl.match(
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
    );
    if (!githubUrlMatch) {
      throw new CustomError("Invalid GitHub repository URL", 400);
    }

    const [, owner, repo] = githubUrlMatch;

    // Get GitHub token
    const userId = req.user?._id;
    let githubToken: string | undefined = process.env.GITHUB_TOKEN;

    if (userId) {
      try {
        const installation = await getUserGitHubInstallation(userId);
        githubToken = await generateInstallationToken(
          installation.installationId
        );
      } catch (error) {
        console.log("⚠️ Could not generate GitHub token, using fallback");
      }
    }

    // For public repositories, we can use unauthenticated requests
    if (!githubToken) {
      console.log(
        "🌐 Using unauthenticated requests for public repository access"
      );
    }

    const { Octokit } = await import("@octokit/rest");
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
    const { repoUrl, title, body, labels, assignees } = req.body;

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
          installation = await getUserGitHubInstallation(userId);
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
    const { Octokit } = await import("@octokit/rest");
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
