// apps/api/src/controllers/team.controller.ts
import { NextFunction, Request, Response } from 'express';
import Team, { ITeam } from '../models/team.model.js';
import { clerkClient } from '@clerk/express';
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import { CustomError } from '../middlewares/error.js';
import { logger } from '../utils/logger.js';


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

export const getTeamRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
  
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

    // Find repositories where the teamId exists in the teams array
    const repos = await Github_Repository.find({ teams: teamId })
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