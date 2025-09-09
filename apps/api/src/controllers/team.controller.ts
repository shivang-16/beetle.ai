// apps/api/src/controllers/team.controller.ts
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import Team, { ITeam, TeamRole } from '../models/team.model.js';
import { clerkClient } from '@clerk/express';
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import User, { IUser } from '../models/user.model.js';
import { CustomError } from '../middlewares/error.js';
import { logError, logInfo, logTrace, logWarn } from '../utils/logger.js';

const isObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const generateUniqueSlug = async (base: string) => {
  let candidate = slugify(base);
  if (!candidate) candidate = Math.random().toString(36).slice(2, 10);
  let unique = false;
  let attempt = 0;
  while (!unique) {
    const exists = await Team.findOne({ slug: candidate }).lean();
    if (!exists) {
      unique = true;
      break;
    }
    attempt += 1;
    candidate = `${candidate}-${attempt + 1}`;
  }
  return candidate;
};

const ensureMember = (team: ITeam, userId: string) =>
  team.members.find((m) => m.userId === userId);

const ensureRoleAtLeast = (role: TeamRole, required: TeamRole) => {
  const order: TeamRole[] = ['member', 'admin', 'owner'];
  return order.indexOf(role) >= order.indexOf(required);
};

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, slug } = req.body as { name: string; description?: string; slug?: string };
    const ownerId = req.user._id as string;

    const finalSlug = slug ? slugify(slug) : await generateUniqueSlug(name);

    const team = await Team.create({
      name,
      description,
      slug: finalSlug,
      ownerId,
      members: [{ userId: ownerId, role: 'owner', joinedAt: new Date() }],
      settings: {},
    });

    logInfo(`Team created ${team._id} by ${ownerId}`);
    return res.status(201).json({ success: true, data: team });
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.slug) {
      return next(new CustomError('Slug already in use', 409));
    }
    logError(`createTeam error: ${err}`);
    return next(new CustomError('Failed to create team', 500));
  }
};

export const listMyTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id as string;
    const teams = await Team.find({ 'members.userId': userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: teams });
  } catch (err) {
    logError(`listMyTeams error: ${err}`);
    return next(new CustomError('Failed to fetch teams', 500));
  }
};

export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params as { teamId: string };

    const team = isObjectId(teamId)
      ? await Team.findById(teamId)
      : await Team.findOne({ slug: teamId });

    if (!team) return next(new CustomError('Team not found', 404));

    const member = ensureMember(team, req.user._id);
    if (!member) return next(new CustomError('Forbidden: not a team member', 403));

    return res.status(200).json({ success: true, data: team });
  } catch (err) {
    logError(`getTeam error: ${err}`);
    return next(new CustomError('Failed to fetch team', 500));
  }
};

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
      members: [{ userId: req.user._id, role: 'owner', joinedAt: new Date() }],
      settings: {},
    });

    return res.status(201).json({ success: true, data: team });
  } catch (err) {
    logError(`getOrCreateCurrentOrgTeam error: ${err}`);
    return next(new CustomError('Failed to ensure organization team', 500));
  }
};

export const updateTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params as { teamId: string };
    const { name, description } = req.body as { name?: string; description?: string };

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const member = ensureMember(team, req.user._id);
    if (!member || !ensureRoleAtLeast(member.role, 'admin')) {
      return next(new CustomError('Forbidden: admin or owner required', 403));
    }

    if (typeof name !== 'undefined') team.name = name;
    if (typeof description !== 'undefined') team.description = description;

    await team.save();
    return res.status(200).json({ success: true, data: team });
  } catch (err) {
    logError(`updateTeam error: ${err}`);
    return next(new CustomError('Failed to update team', 500));
  }
};

export const deleteTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params as { teamId: string };

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    if (team.ownerId !== req.user._id) {
      return next(new CustomError('Only the owner can delete the team', 403));
    }

    await Team.deleteOne({ _id: team._id });
    return res.status(200).json({ success: true, message: 'Team deleted' });
  } catch (err) {
    logError(`deleteTeam error: ${err}`);
    return next(new CustomError('Failed to delete team', 500));
  }
};

export const getMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params as { teamId: string };
    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const member = ensureMember(team, req.user._id);
    if (!member) return next(new CustomError('Forbidden: not a team member', 403));

    return res.status(200).json({ success: true, data: team.members });
  } catch (err) {
    logError(`getMembers error: ${err}`);
    return next(new CustomError('Failed to fetch members', 500));
  }
};

export const addMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params as { teamId: string };
    const { userId, email, role } = req.body as { userId?: string; email?: string; role?: TeamRole };

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const actor = ensureMember(team, req.user._id);
    if (!actor || !ensureRoleAtLeast(actor.role, 'admin')) {
      return next(new CustomError('Forbidden: admin or owner required', 403));
    }

    let targetUserId = userId || '';
    if (!targetUserId && email) {
        const user = await User.findOne({ email }).select('_id');
        if (!user) return next(new CustomError('User with given email not found', 404));
        targetUserId = user._id as unknown as string;
    }

    if (!targetUserId) return next(new CustomError('userId or email required', 400));
    if (team.members.some((m: { userId: string }) => m.userId === targetUserId)) {
      return next(new CustomError('User is already a member', 409));
    }

    team.members.push({
      userId: targetUserId,
      role: role || 'member',
      joinedAt: new Date(),
    });

    await team.save();
    return res.status(200).json({ success: true, data: team.members });
  } catch (err) {
    logError(`addMember error: ${err}`);
    return next(new CustomError('Failed to add member', 500));
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId, memberId } = req.params as { teamId: string; memberId: string };

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const actor = ensureMember(team, req.user._id);
    if (!actor || !ensureRoleAtLeast(actor.role, 'admin')) {
      return next(new CustomError('Forbidden: admin or owner required', 403));
    }

    if (memberId === team.ownerId) {
      return next(new CustomError('Cannot remove the team owner', 400));
    }

    const prevLen = team.members.length;
    team.members = team.members.filter((m: { userId: string }) => m.userId !== memberId);
    if (team.members.length === prevLen) {
      return next(new CustomError('Member not found', 404));
    }

    await team.save();
    return res.status(200).json({ success: true, data: team.members });
  } catch (err) {
    logError(`removeMember error: ${err}`);
    return next(new CustomError('Failed to remove member', 500));
  }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId, memberId } = req.params as { teamId: string; memberId: string };
    const { role } = req.body as { role: Exclude<TeamRole, 'owner'> };

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const actor = ensureMember(team, req.user._id);
    if (!actor || !ensureRoleAtLeast(actor.role, 'admin')) {
      return next(new CustomError('Forbidden: admin or owner required', 403));
    }

    if (memberId === team.ownerId) {
      return next(new CustomError('Cannot change the owner role', 400));
    }

    const member = team.members.find((m: { userId: string }) => m.userId === memberId);
    if (!member) return next(new CustomError('Member not found', 404));

    member.role = role as TeamRole;
    await team.save();
    return res.status(200).json({ success: true, data: team.members });
  } catch (err) {
    logError(`updateMemberRole error: ${err}`);
    return next(new CustomError('Failed to update member role', 500));
  }
};

export const getTeamRepositories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params as { teamId: string };

    const team = await Team.findById(teamId);
    if (!team) return next(new CustomError('Team not found', 404));

    const member = ensureMember(team, req.user._id);
    if (!member) return next(new CustomError('Forbidden: not a team member', 403));

    const memberUserIds = team.members.map((m: { userId: string }) => m.userId);

    const installations = await Github_Installation.find({ userId: { $in: memberUserIds } }).select('_id');
    const installationIds = installations.map((ins) => ins._id);

    if (installationIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const repos = await Github_Repository.find({ github_installationId: { $in: installationIds } })
      .sort({ fullName: 1 })
      .lean();

    return res.status(200).json({ success: true, data: repos });
  } catch (err) {
    logError(`getTeamRepositories error: ${err}`);
    return next(new CustomError('Failed to fetch team repositories', 500));
  }
};