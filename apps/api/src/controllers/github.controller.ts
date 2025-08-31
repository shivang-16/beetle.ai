// apps/api/src/controllers/github.controller.ts
import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../middlewares/error.js';
import { generateInstallationToken } from '../lib/githubApp.js';
import { getUserGitHubInstallation } from '../queries/github.queries.js';

export const getRepoTree = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { repoUrl } = req.body;
        
        if (!repoUrl) {
            throw new CustomError('Repository URL is required', 400);
        }

        // Parse GitHub URL to extract owner and repo
        const githubUrlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
        if (!githubUrlMatch) {
            throw new CustomError('Invalid GitHub repository URL', 400);
        }

        const [, owner, repo] = githubUrlMatch;
        
        console.log(`🌳 Getting repository tree for: ${owner}/${repo}`);

        // Get GitHub token for authenticated user or use fallback
        const userId = req.user?._id;
        let githubToken: string | undefined = process.env.GITHUB_TOKEN; // Fallback to env token

        if (userId) {
            try {
                console.log('🔑 Generating GitHub installation token...');
                const installation = await getUserGitHubInstallation(userId);
                githubToken = await generateInstallationToken(installation.installationId);
                console.log('✅ GitHub token generated successfully');
            } catch (error) {
                console.log('⚠️ Could not generate GitHub token, using fallback:', error);
            }
        }

        // For public repositories, we can use unauthenticated requests
        if (!githubToken) {
            console.log('🌐 Using unauthenticated requests for public repository access');
        }

        // Import Octokit dynamically
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit(githubToken ? { auth: githubToken } : {});

        // 1. Get default branch commit SHA
        console.log('📋 Getting default branch...');
        const { data: ref } = await octokit.git.getRef({
            owner,
            repo,
            ref: 'heads/main' // Try main first
        });

        const commitSha = ref.object.sha;
        console.log(`✅ Found commit SHA: ${commitSha.substring(0, 8)}...`);

        // 2. Get commit to find tree_sha
        console.log('🌲 Getting commit tree...');
        const { data: commit } = await octokit.git.getCommit({
            owner,
            repo,
            commit_sha: commitSha,
        });

        const treeSha = commit.tree.sha;
        console.log(`✅ Found tree SHA: ${treeSha.substring(0, 8)}...`);

        // 3. Get full tree (recursive)
        console.log('📁 Getting full repository tree...');
        const { data: tree } = await octokit.git.getTree({
            owner,
            repo,
            tree_sha: treeSha,
            recursive: true,
        });

        // Process and format the tree data
        const treeData = tree.tree.map(item => ({
            path: item.path,
            type: item.type, // "tree" = folder, "blob" = file
            size: item.size || 0,
            sha: item.sha,
            url: item.url
        }));

        // Group by file types and calculate statistics
        const stats = {
            total_files: treeData.filter(item => item.type === 'blob').length,
            total_folders: treeData.filter(item => item.type === 'tree').length,
            total_items: treeData.length,
            file_extensions: {} as Record<string, number>
        };

        // Count file extensions
        treeData.forEach(item => {
            if (item.type === 'blob' && item.path) {
                const extension = item.path.split('.').pop()?.toLowerCase() || 'no-extension';
                stats.file_extensions[extension] = (stats.file_extensions[extension] || 0) + 1;
            }
        });

        console.log(`✅ Repository tree retrieved successfully`);
        console.log(`📊 Stats: ${stats.total_files} files, ${stats.total_folders} folders`);

        res.json({
            success: true,
            data: {
                repository: {
                    owner,
                    repo,
                    url: repoUrl
                },
                tree: treeData,
                statistics: stats,
                commit: {
                    sha: commitSha,
                    message: commit.message,
                    author: commit.author,
                    date: commit.author?.date
                }
            }
        });

    } catch (error: any) {
        console.error('❌ Error getting repository tree:', error);
        
        if (error.status === 404) {
            next(new CustomError('Repository not found or access denied', 404));
        } else if (error.status === 401) {
            next(new CustomError('GitHub authentication failed', 401));
        } else if (error.status === 403) {
            next(new CustomError('Repository access forbidden', 403));
        } else {
            next(new CustomError(error.message || 'Failed to get repository tree', 500));
        }
    }
};

export const getRepoInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { repoUrl } = req.body;
        
        if (!repoUrl) {
            throw new CustomError('Repository URL is required', 400);
        }

        // Parse GitHub URL
        const githubUrlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
        if (!githubUrlMatch) {
            throw new CustomError('Invalid GitHub repository URL', 400);
        }

        const [, owner, repo] = githubUrlMatch;

        // Get GitHub token
        const userId = req.user?._id;
        let githubToken: string | undefined = process.env.GITHUB_TOKEN;

        if (userId) {
            try {
                const installation = await getUserGitHubInstallation(userId);
                githubToken = await generateInstallationToken(installation.installationId);
            } catch (error) {
                console.log('⚠️ Could not generate GitHub token, using fallback');
            }
        }

        // For public repositories, we can use unauthenticated requests
        if (!githubToken) {
            console.log('🌐 Using unauthenticated requests for public repository access');
        }

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit(githubToken ? { auth: githubToken } : {});

        // Get repository information
        const { data: repoInfo } = await octokit.repos.get({
            owner,
            repo
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
                ssh_url: repoInfo.ssh_url
            }
        });

    } catch (error: any) {
        console.error('❌ Error getting repository info:', error);
        next(new CustomError(error.message || 'Failed to get repository info', 500));
    }
};

