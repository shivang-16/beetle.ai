// apps/api/src/controllers/team.controller.ts
import { NextFunction, Request, Response } from 'express';
import Team, { ITeam } from '../models/team.model.js';
import AIModel, { IAIModel } from '../models/ai_model.model.js';
import { clerkClient } from '@clerk/express';
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import { CustomError } from '../middlewares/error.js';
import { logger } from '../utils/logger.js';
import Analysis from '../models/analysis.model.js';
import GithubIssue from '../models/github_issue.model.js';
import GithubPullRequest from '../models/github_pull_request.model.js';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');


const ensureMember = (team: ITeam, userId: string) =>
  team.members.find((m) => m.userId === userId);


export const getOrCreateCurrentOrgTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.org?.id) {
      return next(new CustomError('Select an organization to continue', 400));
    }

    let team = await Team.findById(req.org.id);
    if (team) {
      return res.status(200).json({ success: true, data: team });
    }

    // Fetch org details from Clerk to seed the local team
    const org = await clerkClient.organizations.getOrganization({ organizationId: req.org.id });
    const slug = org.slug || slugify(org.name || 'organization');

    team = await Team.create({
      _id: req.org.id,
      name: org.name,
      description: '',
      slug,
      ownerId: req.user._id,
      members: [{ userId: req.user._id, role: 'admin', joinedAt: new Date() }],
      settings: {},
    });

    return res.status(201).json({ success: true, data: team });
  } catch (err) {
    logger.error(`getOrCreateCurrentOrgTeam error: ${err}`);
    return next(new CustomError('Failed to ensure organization team', 500));
  }
};

export const getTeamSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id || req.org?.id;
    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }
    const team = await Team.findById(teamId).select('settings');
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }
    return res.status(200).json({ success: true, data: team.settings || {} });
  } catch (error: any) {
    next(new CustomError(error.message || 'Failed to get team settings', 500));
  }
};

export const updateTeamSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id || req.org?.id;
    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }
    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }
    const s = typeof team.settings === 'object' && team.settings ? { ...(team.settings as any) } : {};
    const body = req.body || {};
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
    team.settings = nextSettings;
    await team.save();
    return res.status(200).json({ success: true, message: 'Settings updated', data: nextSettings });
  } catch (error: any) {
    next(new CustomError(error.message || 'Failed to update team settings', 500));
  }
};

export const getTeamRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgSlug, search } = req.query;
  
    // Use team ID from header context (set by middleware) or fallback to params
    const teamId = req.team?.id || req.params.teamId;
        console.log("teamId", teamId)

    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const member = ensureMember(team, req.user._id);
    if (!member) return next(new CustomError('Forbidden: not a team member', 403));

    // Build query for repositories where the teamId exists in the teams array
    let query: any = { teams: teamId };
    
    // If orgSlug is provided and not 'all', filter by organization
    if (orgSlug && orgSlug !== 'undefined' && orgSlug !== 'all' && typeof orgSlug === 'string') {
      console.log("orgSlug", orgSlug)
      query['owner.login'] = { $regex: new RegExp(`^${orgSlug}$`, 'i') };
    }

    // Add search filter if search query is provided
    if (search && typeof search === 'string' && search.trim()) {
      const searchConditions = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { fullName: { $regex: search.trim(), $options: 'i' } }
      ];
      
      // If query already has $or conditions, combine them
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Find repositories based on the query
    const repos = await Github_Repository.find(query)
      .sort({ fullName: 1 })
      .lean();

      console.log("repos", repos)

    return res.status(200).json({ success: true, data: repos });
  } catch (err) {
    logger.error(`getTeamRepositories error: ${err}`);
    return next(new CustomError('Failed to fetch team repositories', 500));
  }
};

export const getMyTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find({ 'members.userId': req.user._id })
      .select('_id name slug members')
      .lean();

    const result = teams.map((t: any) => ({
      _id: t._id,
      name: t.name,
      slug: t.slug,
      role: t.members.find((m: any) => m.userId === req.user._id)?.role,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error(`getMyTeams error: ${err}`);
    return next(new CustomError('Failed to fetch user teams', 500));
  }
};

// Add repositories into a team
export const addReposInTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team ID from header context (set by middleware) or fallback to params
    const teamId = req.team?.id 
    console.log("teamId", teamId)
    
    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }

    const { repoIds } = req.body as { repoIds: number[] };

    if (!Array.isArray(repoIds) || repoIds.length === 0) {
      return next(new CustomError('repoIds must be a non-empty array of repositoryId numbers', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    // Admin role check is now handled by checkTeamRole middleware
    const member = ensureMember(team, req.user._id);
    if (!member) {
      return next(new CustomError('Forbidden: not a team member', 403));
    }

    // Ensure these repos belong to installations owned by team owner (same visibility scope as getTeamRepositories)
    const installations = await Github_Installation.find({ userId: team.ownerId }).select('_id');
    const installationIds = installations.map((ins) => ins._id);

    if (installationIds.length === 0) {
      return res.status(200).json({ success: true, data: [], message: 'No installations available for this team owner' });
    }

    // Update repositories: add teamId to teams array if not already present
    const result = await Github_Repository.updateMany(
      { repositoryId: { $in: repoIds }, github_installationId: { $in: installationIds } },
      { $addToSet: { teams: teamId } }
    );

    // Optionally fetch updated repos to return
    const updatedRepos = await Github_Repository.find({ repositoryId: { $in: repoIds } })
      .select('_id repositoryId fullName teams')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        matchedCount: result.matchedCount ?? (result as any).n, // Mongoose version compatible
        modifiedCount: result.modifiedCount ?? (result as any).nModified,
        repos: updatedRepos,
      },
    });
  } catch (err) {
    logger.error(`addReposInTeam error: ${err}`);
    return next(new CustomError('Failed to add repositories to team', 500));
  }
};

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
                const sumCommentsAcrossPRs = prEntries.reduce((acc, e) => acc + e.total, 0);
                const avg = uniquePRs > 0 ? sumCommentsAcrossPRs / uniquePRs : 0;
                out.push({ date: key, count: Number(avg.toFixed(2)) });
            }
            return out;
        };

        // Get all repositories that belong to this team
        const repositories = await Github_Repository.find({ teams: teamId }).lean();
        const repositoryIds = repositories.map(repo => repo._id);

        // Get total repositories added to team
        const total_repo_added = repositories.length;

        // Get analyses split by type for team repositories (using team owner's userId)
        const fullRepoAnalyses = await Analysis.find({
                      github_repositoryId: { $in: repositoryIds },

            userId: team.ownerId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        const prAnalyses = await Analysis.find({
                      github_repositoryId: { $in: repositoryIds },

            userId: team.ownerId,
            analysis_type: 'pr_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all GitHub issues created for team repositories
        const githubIssues = await GithubIssue.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: team.ownerId,
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all pull requests created for team repositories
        const pullRequests = await GithubPullRequest.find({
            github_repositoryId: { $in: repositoryIds },
            createdBy: team.ownerId,
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Calculate full repo review metrics (only full repo analyses)
        const total_reviews = fullRepoAnalyses.length;
        const total_github_issues_suggested = githubIssues.length;
        const github_issues_opened = githubIssues.filter(issue => issue.state !== 'draft').length;
        const total_pull_request_suggested = pullRequests.length;
        const pull_request_opened = pullRequests.filter(pr => pr.state !== 'draft').length;

        // Get recent activity (last 5 items) - both full repo analyses and PR analyses
        const recentFullRepoAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: team.ownerId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        const recentPrAnalyses = await Analysis.find({
            github_repositoryId: { $in: repositoryIds },
            userId: team.ownerId,
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
        console.error('Error getting team dashboard info:', error);
        return next(new CustomError(error.message || "Failed to get team dashboard info", 500));
    }
}