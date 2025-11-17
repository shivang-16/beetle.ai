import { NextFunction, Request, Response } from "express";
import User from "../models/user.model.js";
import AIModel, { IAIModel } from '../models/ai_model.model.js';
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
      const { orgSlug, search } = req.query;
      
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
        // Build query for repositories with optional search filtering
        const repoQuery: any = {
          github_installationId: installation._id
        };
        
        // Add search filter if search query is provided
        if (search && typeof search === 'string' && search.trim()) {
          repoQuery.$or = [
            { name: { $regex: search.trim(), $options: 'i' } },
            { fullName: { $regex: search.trim(), $options: 'i' } }
          ];
        }
        
        // Get repositories for this installation with optional search filter
        const repositories = await Github_Repository.find(repoQuery);
        
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

        // Time range filter: supports last 7/15/30/60/90 days, default 7
        const allowedDays = new Set([7, 15, 30, 60, 90]);
        const qDays = parseInt(String(req.query.days ?? '7'), 10);
        const days = allowedDays.has(qDays) ? qDays : 7;
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const rangeStart = (() => {
            const d = new Date(now);
            d.setDate(d.getDate() - (days - 1));
            return startOfDay(d);
        })();

        const formatDateKey = (d: Date) => {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            return `${yr}-${mo}-${da}`;
        };
        const buildDailyCounts = (items: any[]) => {
            const map: Record<string, number> = {};
            for (const item of items) {
                const created = new Date(item.createdAt);
                if (created < rangeStart || created > now) continue;
                if (item.status !== 'completed') continue;
                const key = formatDateKey(created);
                map[key] = (map[key] ?? 0) + 1;
            }
            const out: { date: string; count: number }[] = [];
            for (let i = 0; i < days; i++) {
                const d = new Date(rangeStart);
                d.setDate(rangeStart.getDate() + i);
                const key = formatDateKey(d);
                out.push({ date: key, count: map[key] ?? 0 });
            }
            return out;
        };

        // Build daily average comments per unique PR (unique by pr_url or pr_number+repoUrl)
        const buildDailyAvgCommentsForUniquePRs = (items: any[]) => {
            const dayToPRMap: Record<string, Record<string, { total: number; runs: number }>> = {};
            for (const item of items) {
                const created = new Date(item.createdAt);
                if (created < rangeStart || created > now) continue;
                if (item.status !== 'completed') continue;
                const key = formatDateKey(created);
                const prKey = (item.pr_url && item.pr_url.length > 0)
                  ? String(item.pr_url)
                  : `${item.repoUrl}#${item.pr_number ?? ''}`;
                const comments = typeof item.pr_comments_posted === 'number' ? item.pr_comments_posted : 0;
                if (!dayToPRMap[key]) dayToPRMap[key] = {};
                if (!dayToPRMap[key][prKey]) dayToPRMap[key][prKey] = { total: 0, runs: 0 };
                dayToPRMap[key][prKey].total += comments;
                dayToPRMap[key][prKey].runs += 1;
            }
            const out: { date: string; count: number }[] = [];
            for (let i = 0; i < days; i++) {
                const d = new Date(rangeStart);
                d.setDate(rangeStart.getDate() + i);
                const key = formatDateKey(d);
                const prEntries = Object.values(dayToPRMap[key] || {});
                const uniquePRs = prEntries.length;
                const sumCommentsAcrossPRs = prEntries.reduce((acc, e) => acc + (e.total / Math.max(1, e.runs)), 0);
                const avg = uniquePRs > 0 ? sumCommentsAcrossPRs / uniquePRs : 0;
                out.push({ date: key, count: Number(avg.toFixed(2)) });
            }
            return out;
        };

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

        // Get analyses split by type for user repositories
        const fullRepoAnalyses = await Analysis.find({
            userId: userId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        const prAnalyses = await Analysis.find({
            userId: userId,
            analysis_type: 'pr_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all GitHub issues created by the user
        const githubIssues = await GithubIssue.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: userId,
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all pull requests created by the user
        const pullRequests = await GithubPullRequest.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: userId,
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Calculate full repo review metrics (only full repo analyses)
        const total_reviews = fullRepoAnalyses.length;
        const total_github_issues_suggested = githubIssues.length;
        const github_issues_opened = githubIssues.filter(issue => issue.state !== 'draft').length;
        const total_pull_request_suggested = pullRequests.length;
        const pull_request_opened = pullRequests.filter(pr => pr.state !== 'draft').length;

        // Get recent activity (last 10 items) - both full repo analyses and PR analyses
        const recentFullRepoAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: userId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        const recentPrAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: userId,
            analysis_type: 'pr_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
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
                pull_request_opened: repoPRs.filter(pr => pr.state !== 'draft').length,
                repo_id: (repo?._id ? String(repo._id) : String(analysis.github_repositoryId)),
                analysis_id: String(analysis._id)
            };
        });

        const recent_pull_requests = recentPrAnalyses.map(analysis => {
            const repo = analysis.github_repositoryId as any;
            const prUrl = (analysis as any).pr_url && (analysis as any).pr_url.length > 0
              ? String((analysis as any).pr_url)
              : (analysis as any).pr_number && repo?.fullName
                ? `https://github.com/${repo.fullName}/pull/${(analysis as any).pr_number}`
                : undefined;
            return {
                repo_name: repo?.fullName || 'Unknown',
                pr_title: (analysis as any).pr_title ?? undefined,
                pr_number: (analysis as any).pr_number ?? undefined,
                state: analysis.status,
                date: analysis.createdAt,
                total_comments: typeof (analysis as any).pr_comments_posted === 'number' ? (analysis as any).pr_comments_posted : 0,
                pr_url: prUrl,
                repo_id: (repo?._id ? String(repo._id) : String(analysis.github_repositoryId)),
                analysis_id: String(analysis._id)
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
            pr_reviews: {
                total_reviews: prAnalyses.length,
                total_comments: prAnalyses
                  .filter(a => a.status === 'completed')
                  .reduce((acc, a) => acc + (typeof (a as any).pr_comments_posted === 'number' ? (a as any).pr_comments_posted : 0), 0)
            },
            recent_activity: {
                pull_request: recent_pull_requests,
                full_repo: recent_full_repo
            },
            trends: {
                daily_full_repo_reviews: buildDailyCounts(fullRepoAnalyses),
                daily_pr_reviews: buildDailyCounts(prAnalyses),
                daily_pr_comments_avg: buildDailyAvgCommentsForUniquePRs(prAnalyses),
                range_days: days
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



export const getUserSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    if (!user) {
      return next(new CustomError('User not found', 404));
    }
    return res.status(200).json({ success: true, data: user.settings || {} });
  } catch (error: any) {
    next(new CustomError(error.message || 'Failed to get user settings', 500));
  }
};

export const updateUserSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new CustomError('User not found', 404));
    }
    const body = req.body || {};
    const s = typeof user.settings === 'object' && user.settings ? { ...(user.settings as any) } : {};
    const nextSettings: any = { ...s };

    const repoId = typeof body.defaultModelRepoId === 'string' ? body.defaultModelRepoId : undefined;
    const prId = typeof body.defaultModelPrId === 'string' ? body.defaultModelPrId : undefined;

    if (repoId) {
      const m = await AIModel.findById(repoId).select('name provider').lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelRepo = m.name;
        nextSettings.defaultProviderRepo = m.provider;
        nextSettings.defaultModelRepoId = String(m._id);
      }
    } else if (typeof body.defaultModelRepo === 'string') {
      const m = await AIModel.findOne({ name: body.defaultModelRepo }).select('name provider').lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelRepo = m.name;
        nextSettings.defaultProviderRepo = m.provider;
        nextSettings.defaultModelRepoId = String(m._id);
      }
    }

    if (prId) {
      const m = await AIModel.findById(prId).select('name provider').lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelPr = m.name;
        nextSettings.defaultProviderPr = m.provider;
        nextSettings.defaultModelPrId = String(m._id);
      }
    } else if (typeof body.defaultModelPr === 'string') {
      const m = await AIModel.findOne({ name: body.defaultModelPr }).select('name provider').lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelPr = m.name;
        nextSettings.defaultProviderPr = m.provider;
        nextSettings.defaultModelPrId = String(m._id);
      }
    }

    user.settings = nextSettings;
    await user.save();
    return res.status(200).json({ success: true, message: 'Settings updated', data: nextSettings });
  } catch (error: any) {
    next(new CustomError(error.message || 'Failed to update user settings', 500));
  }
};