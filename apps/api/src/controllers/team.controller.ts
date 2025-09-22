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
    const { teamId } = req.params as { teamId: string };

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const member = ensureMember(team, req.user._id);
    if (!member) return next(new CustomError('Forbidden: not a team member', 403));


    const installations = await Github_Installation.find({ userId: team.ownerId }).select('_id');
    const installationIds = installations.map((ins) => ins._id);

    if (installationIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const repos = await Github_Repository.find({ github_installationId: { $in: installationIds } })
      .sort({ fullName: 1 })
      .lean();

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