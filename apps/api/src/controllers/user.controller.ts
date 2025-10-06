import { NextFunction, Request, Response } from "express";
import User from "../models/user.model.js";
import { CustomError } from "../middlewares/error.js";
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import Analysis from '../models/analysis.model.js';
import GithubIssue from '../models/github_issue.model.js';
import GithubPullRequest from '../models/github_pull_request.model.js';
import Team from '../models/team.model.js';

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return next(new CustomError("User not found", 404));
        }
        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        return next(new CustomError("User not found", 404));
    }
}

export const getUserInstallations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Find all installations for the user
        const installations = await Github_Installation.find({userId: req.user._id}).sort({ installedAt: -1 });

        if (!installations || installations.length === 0) {
            return next(new CustomError('No installations found', 404));
        }

        // Extract account information
        const accounts = installations.map(installation => ({
            id: installation._id,
            login: installation.account.login,
            type: installation.account.type || 'Organization',
            avatarUrl: installation.account.avatarUrl || null
        }));

        res.status(200).json({
            success: true,
            data: accounts
        });
        
    } catch (error) {
        console.error('Error getting user installations:', error);
        next(new CustomError('Failed to get user installations', 500));
    }
}

export const getUserRepositories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgSlug } = req.query;
      
      // Find all installations for the user
      let installations;
      if (!orgSlug || orgSlug ==='undefined' || orgSlug === 'all') {
        // Get all installations for the user
        installations = await Github_Installation.find({userId: req.user._id}).sort({ installedAt: -1 });
      } else {
        // Get specific installation by account name
        installations = await Github_Installation.find({
          userId: req.user._id,
          'account.login': { $regex: new RegExp(`^${orgSlug}$`, 'i') }
        }).sort({ installedAt: -1 });
      }
  
      if (!installations || installations.length === 0) {
        return next(new CustomError('No installations found', 404));
      }
  
      // Collect all repositories in a flat array
      const allRepositories: any[] = [];
  
      for (const installation of installations) {
        // Get repositories for this installation
        const repositories = await Github_Repository.find({
          github_installationId: installation._id
        });
        
        allRepositories.push(...repositories);
      }
  
      res.status(200).json({
        success: true,
        data: allRepositories
      });
      
    } catch (error) {
      console.error('Error getting user repositories:', error);
      next(new CustomError('Failed to get user repositories', 500));
    }
  }

export const getUserDashboardInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user._id;

        // Get all user installations to find their repositories
        const installations = await Github_Installation.find({ userId }).lean();
        const installationIds = installations.map(inst => inst._id);

        // Get all repositories for the user
        const repositories = await Github_Repository.find({
            github_installationId: { $in: installationIds }
        }).lean();
        const repositoryIds = repositories.map(repo => repo._id);

        // Get total repositories added
        const total_repo_added = repositories.length;

        // Get all analyses (full repo reviews) for user repositories
        const analyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: userId
        }).lean();

        // Get all GitHub issues created by the user
        const githubIssues = await GithubIssue.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: userId
        }).lean();

        // Get all pull requests created by the user
        const pullRequests = await GithubPullRequest.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: userId
        }).lean();

        // Calculate full repo review metrics
        const total_reviews = analyses.length;
        const total_github_issues_suggested = githubIssues.length;
        const github_issues_opened = githubIssues.filter(issue => issue.state !== 'draft').length;
        const total_pull_request_suggested = pullRequests.length;
        const pull_request_opened = pullRequests.filter(pr => pr.state !== 'draft').length;

        // Get recent activity (last 10 items) - both full repo analyses and PR analyses
        const recentFullRepoAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: userId,
            analysis_type: 'full_repo_analysis'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        const recentPrAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: userId,
            analysis_type: 'pr_analysis'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        // Format recent activity data
        const recent_full_repo = recentFullRepoAnalyses.map(analysis => {
            const repo = analysis.github_repositoryId as any;
            const repoIssues = githubIssues.filter(issue => 
                issue.github_repositoryId.toString() === analysis.github_repositoryId.toString() &&
                issue.analysisId?.toString() === (analysis._id as string).toString()
            );
            const repoPRs = pullRequests.filter(pr => 
                pr.github_repositoryId.toString() === analysis.github_repositoryId.toString() &&
                pr.analysisId?.toString() === (analysis._id as string).toString()
            );

            return {
                repo_name: repo?.fullName || 'Unknown',
                branch: repo?.defaultBranch || 'main',
                state: analysis.status,
                date: analysis.createdAt,
                total_github_issues_suggested: repoIssues.length,
                github_issues_opened: repoIssues.filter(issue => issue.state !== 'draft').length,
                total_pull_request_suggested: repoPRs.length,
                pull_request_opened: repoPRs.filter(pr => pr.state !== 'draft').length
            };
        });

        const recent_pull_requests = recentPrAnalyses.map(analysis => {
            const repo = analysis.github_repositoryId as any;
            return {
                repo_name: repo?.fullName || 'Unknown',
                state: analysis.status,
                date: analysis.createdAt,
                total_comments: 0 // As requested, leaving this as 0
            };
        });

        const dashboardData = {
            total_repo_added,
            full_repo_review: {
                total_reviews,
                total_github_issues_suggested,
                github_issues_opened,
                total_pull_request_suggested,
                pull_request_opened
            },
            pr_review: {
                total_reviews: 0, // No separate PR review tracking found in models
                total_comments: 0 // As requested, leaving this as 0
            },
            recent_activity: {
                pull_request: recent_pull_requests,
                full_repo: recent_full_repo
            }
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error: any) {
        console.error('Error getting user dashboard info:', error);
        return next(new CustomError(error.message || "Failed to get dashboard info", 500));
    }
}

export const getTeamDashboardInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teamId = req.team?.id;

        if (!teamId) {
            return next(new CustomError('Team context required', 400));
        }

        // Verify team exists and user has access
        const team = await Team.findById(teamId);
        if (!team) {
            return next(new CustomError('Team not found', 404));
        }

        // Check if user is a member of the team
        const member = team.members.find((m: any) => m.userId === req.user._id);
        if (!member) {
            return next(new CustomError('Forbidden: not a team member', 403));
        }

        // Get all repositories that belong to this team
        const repositories = await Github_Repository.find({ teams: teamId }).lean();
        const repositoryIds = repositories.map(repo => repo._id);

        // Get total repositories added to team
        const total_repo_added = repositories.length;

        // Get all analyses for team repositories (using team owner's userId for analyses)
        const analyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: team.ownerId
        }).lean();

        // Get all GitHub issues created for team repositories
        const githubIssues = await GithubIssue.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: team.ownerId
        }).lean();

        // Get all pull requests created for team repositories
        const pullRequests = await GithubPullRequest.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: team.ownerId
        }).lean();

        // Calculate full repo review metrics
        const total_reviews = analyses.length;
        const total_github_issues_suggested = githubIssues.length;
        const github_issues_opened = githubIssues.filter(issue => issue.state !== 'draft').length;
        const total_pull_request_suggested = pullRequests.length;
        const pull_request_opened = pullRequests.filter(pr => pr.state !== 'draft').length;

        // Get recent activity (last 5 items) - both full repo analyses and PR analyses
        const recentFullRepoAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: team.ownerId,
            analysis_type: 'full_repo_analysis'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        const recentPrAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: team.ownerId,
            analysis_type: 'pr_analysis'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        // Format recent activity data
        const recent_full_repo = recentFullRepoAnalyses.map(analysis => {
            const repo = analysis.github_repositoryId as any;
            const repoIssues = githubIssues.filter(issue => 
                issue.github_repositoryId.toString() === analysis.github_repositoryId.toString() &&
                issue.analysisId?.toString() === (analysis._id as string).toString()
            );
            const repoPRs = pullRequests.filter(pr => 
                pr.github_repositoryId.toString() === analysis.github_repositoryId.toString() &&
                pr.analysisId?.toString() === (analysis._id as string).toString()
            );

            return {
                repo_name: repo?.fullName || 'Unknown',
                branch: repo?.defaultBranch || 'main',
                state: analysis.status,
                date: analysis.createdAt,
                total_github_issues_suggested: repoIssues.length,
                github_issues_opened: repoIssues.filter(issue => issue.state !== 'draft').length,
                total_pull_request_suggested: repoPRs.length,
                pull_request_opened: repoPRs.filter(pr => pr.state !== 'draft').length
            };
        });

        const recent_pull_requests = recentPrAnalyses.map(analysis => {
            const repo = analysis.github_repositoryId as any;
            return {
                repo_name: repo?.fullName || 'Unknown',
                state: analysis.status,
                date: analysis.createdAt,
                total_comments: 0 // As requested, leaving this as 0
            };
        });

        const dashboardData = {
            total_repo_added,
            full_repo_review: {
                total_reviews,
                total_github_issues_suggested,
                github_issues_opened,
                total_pull_request_suggested,
                pull_request_opened
            },
            pr_review: {
                total_reviews: 0, // No separate PR review tracking found in models
                total_comments: 0 // As requested, leaving this as 0
            },
            recent_activity: {
                pull_request: recent_pull_requests,
                full_repo: recent_full_repo
            }
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error: any) {
        console.error('Error getting team dashboard info:', error);
        return next(new CustomError(error.message || "Failed to get team dashboard info", 500));
    }
}
  