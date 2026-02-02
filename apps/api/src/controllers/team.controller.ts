// apps/api/src/controllers/team.controller.ts
import { NextFunction, Request, Response } from 'express';
import Team, { ITeam } from '../models/team.model.js';
import TeamMember from '../models/team_member.model.js';
import AIModel, { IAIModel } from '../models/ai_model.model.js';
import { clerkClient } from '@clerk/express';
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import { CustomError } from '../middlewares/error.js';
import { logger } from '../utils/logger.js';
import Analysis from '../models/analysis.model.js';
import GithubIssue from '../models/github_issue.model.js';
import GithubPullRequest from '../models/github_pull_request.model.js';
import mongoose from 'mongoose';
import { Bitbucket_Workspace } from '../models/bitbucket_workspace.model.js';
import { getAllUserTeams } from '../middlewares/helpers/getUserTeam.js';
import TeamInvitation from '../models/team_invitation.model.js';
import { mailService } from '../services/mail/mail_service.js';


const isTeamOwner = (team: ITeam, userId: string) =>
  team.ownerId === userId;


export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return next(new CustomError('Team name is required', 400));
    }

    // Check if user has a paid subscription
    const subscriptionStatus = req.user.subscriptionStatus;
    if (!subscriptionStatus || subscriptionStatus === 'free') {
      return next(new CustomError('Team creation requires a paid subscription. Please upgrade your plan.', 403));
    }

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      ownerId: req.user._id,
    });

    const teamId = team._id;

    // Create TeamMember entry for owner
    await TeamMember.create({
      teamId: String(teamId),
      userId: req.user._id,
      role: 'owner',
      joinedAt: new Date(),
    });

    logger.info(`Team created: ${team.name} by user ${req.user._id}`);
    return res.status(201).json({ success: true, data: team });
  } catch (err: any) {
    logger.error(`createTeam error: ${err}`);
    return next(new CustomError('Failed to create team', 500));
  }
};

export const getTeamInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team context from middleware
    const teamId = req.team?.id;
    
    if (!teamId) {
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'No team associated with this user'
      });
    }

    type TeamInfo = { _id: string; name: string; description?: string; ownerId: string };
    const team = await Team.findById(teamId).lean() as TeamInfo | null;
    if (!team) {
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'Team not found'
      });
    }

    // Check if user is owner
    const isOwner = String(team.ownerId) === String(req.user._id);
    const userRole = req.team?.role || (isOwner ? 'owner' : 'member');

    // Get team owner's subscription status
    const User = mongoose.model('User');
    type OwnerInfo = { subscriptionStatus?: string; subscriptionPlanId?: any };
    const owner = await User.findById(team.ownerId).select('subscriptionStatus subscriptionPlanId').lean() as OwnerInfo | null;
    
    // Check if owner has a paid plan (not 'free')
    const ownerHasPaidPlan = owner?.subscriptionStatus && owner.subscriptionStatus !== 'free';

    return res.status(200).json({ 
      success: true, 
      data: {
        ...team,
        userRole,
        isOwner,
        ownerHasPaidPlan,
      }
    });
  } catch (err) {
    logger.error(`getTeamInfo error: ${err}`);
    return next(new CustomError('Failed to get team info', 500));
  }
};

export const updateTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id;
    
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Only owner can update team details
    if (team.ownerId !== req.user._id) {
      return next(new CustomError('Only team owner can update team details', 403));
    }

    const { name, description } = req.body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return next(new CustomError('Team name cannot be empty', 400));
      }
      team.name = name.trim();
    }

    // Update description if provided
    if (description !== undefined) {
      team.description = typeof description === 'string' ? description.trim() : undefined;
    }

    await team.save();

    logger.info(`Team ${teamId} updated by user ${req.user._id}`);
    return res.status(200).json({ 
      success: true, 
      message: 'Team updated successfully',
      data: { name: team.name, description: team.description }
    });
  } catch (err) {
    logger.error(`updateTeam error: ${err}`);
    return next(new CustomError('Failed to update team', 500));
  }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id;
    const { memberId } = req.params;
    const { role } = req.body;
    
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }

    if (!memberId) {
      return next(new CustomError('Member ID is required', 400));
    }

    // Validate role
    if (!role || !['admin', 'member'].includes(role)) {
      return next(new CustomError('Role must be either admin or member', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Cannot change role of team owner
    if (team.ownerId === memberId) {
      return next(new CustomError('Cannot change the role of the team owner', 400));
    }

    // Find the member
    const member = await TeamMember.findOne({ teamId, userId: memberId });
    if (!member) {
      return next(new CustomError('Member not found in this team', 404));
    }

    // Check permissions - only owner and admins can change roles
    const currentUserMembership = await TeamMember.findOne({ teamId, userId: req.user._id });
    const isOwner = team.ownerId === req.user._id;
    const isAdmin = currentUserMembership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return next(new CustomError('Only team owner or admins can change member roles', 403));
    }

    member.role = role;
    await member.save();

    logger.info(`Member ${memberId} role changed to ${role} in team ${teamId} by ${req.user._id}`);
    return res.status(200).json({ 
      success: true, 
      message: `Member role updated to ${role}`,
      data: { userId: memberId, role }
    });
  } catch (err) {
    logger.error(`updateMemberRole error: ${err}`);
    return next(new CustomError('Failed to update member role', 500));
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id;
    const { memberId } = req.params;
    
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }

    if (!memberId) {
      return next(new CustomError('Member ID is required', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Cannot remove team owner
    if (team.ownerId === memberId) {
      return next(new CustomError('Cannot remove the team owner', 400));
    }

    // Cannot remove yourself (use leave team instead)
    if (memberId === req.user._id) {
      return next(new CustomError('Cannot remove yourself. Use leave team instead.', 400));
    }

    // Find the member to be removed
    const memberToRemove = await TeamMember.findOne({ teamId, userId: memberId });
    if (!memberToRemove) {
      return next(new CustomError('Member not found in this team', 404));
    }

    // Check permissions - only owner and admins can remove members
    const currentUserMembership = await TeamMember.findOne({ teamId, userId: req.user._id });
    const isOwner = team.ownerId === req.user._id;
    const isAdmin = currentUserMembership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return next(new CustomError('Only team owner or admins can remove members', 403));
    }

    await TeamMember.deleteOne({ teamId, userId: memberId });

    // If the removed user had this team as active, set to another team they own or belong to
    const User = mongoose.model('User');
    const removedUser = await User.findById(memberId).select('activeTeamId').lean() as { activeTeamId?: string } | null;
    
    if (removedUser?.activeTeamId?.toString() === teamId.toString()) {
      // Find a team the user owns
      const ownedTeam = await Team.findOne({ ownerId: memberId }).select('_id').lean() as { _id: string } | null;
      
      if (ownedTeam) {
        await User.updateOne({ _id: memberId }, { $set: { activeTeamId: String(ownedTeam._id) } });
      } else {
        // No owned team, find any team they're a member of
        const anyMembership = await TeamMember.findOne({ userId: memberId }).lean() as { teamId: string } | null;
        if (anyMembership) {
          await User.updateOne({ _id: memberId }, { $set: { activeTeamId: anyMembership.teamId } });
        } else {
          // No teams left, clear activeTeamId
          await User.updateOne({ _id: memberId }, { $unset: { activeTeamId: 1 } });
        }
      }
    }

    logger.info(`Member ${memberId} removed from team ${teamId} by ${req.user._id}`);
    return res.status(200).json({ 
      success: true, 
      message: 'Member removed from team'
    });
  } catch (err) {
    logger.error(`removeMember error: ${err}`);
    return next(new CustomError('Failed to remove member', 500));
  }
};

export const leaveTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id;
    const userId = req.user._id;
    console.log(teamId, userId)
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Owner cannot leave their own team
    if (team.ownerId === userId) {
      return next(new CustomError('Team owner cannot leave the team. Transfer ownership or delete the team instead.', 400));
    }

    // Check if user is a member
    const membership = await TeamMember.findOne({ teamId, userId });
    if (!membership) {
      return next(new CustomError('You are not a member of this team', 404));
    }

    await TeamMember.deleteOne({ teamId, userId });

    // If this was the active team, set activeTeamId to another team the user owns
    const User = mongoose.model('User');
    const user = await User.findById(userId).select('activeTeamId').lean() as { activeTeamId?: string } | null;
    
    if (user?.activeTeamId?.toString() === teamId.toString()) {
      // Find a team the user owns
      const ownedTeam = await Team.findOne({ ownerId: userId }).select('_id').lean() as { _id: string } | null;
      console.log(ownedTeam?._id, "here is owneteam")
      if (ownedTeam) {
        await User.updateOne({ _id: userId }, { $set: { activeTeamId: String(ownedTeam._id) } });
        logger.info(`Set activeTeamId to owned team ${ownedTeam._id} for user ${userId}`);
      } else {
        // No owned team, find any team they're a member of
        const anyMembership = await TeamMember.findOne({ userId }).lean() as { teamId: string } | null;
        if (anyMembership) {
          await User.updateOne({ _id: userId }, { $set: { activeTeamId: anyMembership.teamId } });
          logger.info(`Set activeTeamId to member team ${anyMembership.teamId} for user ${userId}`);
        } else {
          // No teams left, clear activeTeamId
          await User.updateOne({ _id: userId }, { $unset: { activeTeamId: 1 } });
          logger.info(`Cleared activeTeamId for user ${userId} - no teams left`);
        }
      }
    }

    logger.info(`User ${userId} left team ${teamId}`);
    return res.status(200).json({ 
      success: true, 
      message: 'You have left the team'
    });
  } catch (err) {
    logger.error(`leaveTeam error: ${err}`);
    return next(new CustomError('Failed to leave team', 500));
  }
};

export const getTeamMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team context from middleware
    const teamId = req.team?.id;
    
    if (!teamId) {
      return next(new CustomError('No team context available', 400));
    }

    type TeamInfo = { _id: string; ownerId: string };
    const team = await Team.findById(teamId).lean() as TeamInfo | null;
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Get all members from TeamMember collection
    type TeamMemberInfo = { userId: string; role: 'admin' | 'member'; joinedAt: Date };
    const teamMembers = await TeamMember.find({ teamId }).lean() as unknown as TeamMemberInfo[];
    const memberUserIds = teamMembers.map(m => m.userId);

    // Get user info for all members
    const User = mongoose.model('User');
    type UserInfo = { _id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; username?: string };
    
    const users = await User.find({ _id: { $in: memberUserIds } })
      .select('_id firstName lastName email avatarUrl username')
      .lean() as unknown as UserInfo[];

    const userMap = new Map(users.map(u => [u._id, u]));

    // Format response
    const memberList = teamMembers.map(member => {
      const user = userMap.get(member.userId);
      const isOwner = String(team.ownerId) === String(member.userId);
      return {
        _id: member.userId,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl,
        username: user?.username,
        role: member.role,
        isOwner,
        joinedAt: member.joinedAt,
      };
    });

    // Sort: owner first, then by joinedAt
    memberList.sort((a, b) => {
      if (a.isOwner) return -1;
      if (b.isOwner) return 1;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    return res.status(200).json({ 
      success: true, 
      data: memberList,
      total: memberList.length,
    });
  } catch (err) {
    logger.error(`getTeamMembers error: ${err}`);
    return next(new CustomError('Failed to get team members', 500));
  }
};

// ============ INVITATION CONTROLLERS ============


export const inviteToTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role = 'member' } = req.body;
    
    if (!email || typeof email !== 'string') {
      return next(new CustomError('Email is required', 400));
    }

    // Validate role - cannot invite as owner
    if (role === 'owner') {
      return next(new CustomError('Cannot invite users as owner. Only admin or member roles allowed.', 400));
    }

    if (role !== 'admin' && role !== 'member') {
      return next(new CustomError('Role must be either admin or member', 400));
    }

    // Get user's team - must be owner or admin
    const teamId = req.team?.id;
    if (!teamId) {
      return next(new CustomError('No team context available', 400));
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Check if user is owner or admin
    const isOwner = team.ownerId === req.user._id;
    const membership = await TeamMember.findOne({ teamId, userId: req.user._id });
    const isAdmin = membership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return next(new CustomError('Only team owner or admins can invite members', 403));
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already invited (pending)
    const existingInvite = await TeamInvitation.findOne({
      teamId: team._id,
      inviteeEmail: normalizedEmail,
      status: 'pending',
    });
    if (existingInvite) {
      return next(new CustomError('User already has a pending invitation', 400));
    }

    // Check if user is already a member via TeamMember
    const User = mongoose.model('User');
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const existingMembership = await TeamMember.findOne({
        teamId: String(team._id),
        userId: existingUser._id,
      });
      if (existingMembership) {
        return next(new CustomError('User is already a member of this team', 400));
      }
    }

    // Create invitation
    const invitation = await TeamInvitation.create({
      teamId: team._id,
      inviterId: req.user._id,
      inviteeEmail: normalizedEmail,
      inviteeId: existingUser?._id,
      role: role === 'admin' ? 'admin' : 'member',
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send invitation email
    const frontendUrl = process.env.FRONTEND_URL || 'https://beetleai.dev';
    const invitationLink = `${frontendUrl}/invite/${invitation._id}`;
    const inviterName = req.user.firstName && req.user.lastName 
      ? `${req.user.firstName} ${req.user.lastName}` 
      : req.user.username || req.user.email || 'Someone';

    try {
      await mailService.teamInvite({
        to: normalizedEmail,
        inviterName,
        teamName: team.name,
        invitationLink,
      });
      logger.info(`Invitation email sent to ${normalizedEmail}`);
    } catch (emailErr) {
      logger.warn(`Failed to send invitation email to ${normalizedEmail}: ${emailErr}`);
      // Continue even if email fails - invitation is already created
    }

    logger.info(`Invitation created: ${normalizedEmail} to team ${team.name}`);
    return res.status(201).json({ 
      success: true, 
      data: invitation,
      message: `Invitation sent to ${normalizedEmail}`
    });
  } catch (err) {
    logger.error(`inviteToTeam error: ${err}`);
    return next(new CustomError('Failed to send invitation', 500));
  }
};

export const getInvitationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    type InvitationDoc = {
      _id: string;
      teamId: string;
      inviterId: string;
      inviteeEmail: string;
      inviteeId?: string;
      role: 'admin' | 'member';
      status: 'pending' | 'accepted' | 'rejected' | 'expired';
      expiresAt: Date;
    };
    const invitation = await TeamInvitation.findById(id).lean() as InvitationDoc | null;
    if (!invitation) {
      return next(new CustomError('Invitation not found', 404));
    }

    // Check if invitation is for this user
    const userEmail = req.user.email?.toLowerCase();
    if (invitation.inviteeEmail !== userEmail && invitation.inviteeId !== req.user._id) {
      return next(new CustomError('This invitation is not for you', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new CustomError(`Invitation already ${invitation.status}`, 400));
    }

    if (invitation.expiresAt < new Date()) {
      return next(new CustomError('Invitation has expired', 400));
    }

    // Get team details
    type TeamDetails = { _id: string; name: string; description?: string; ownerId: string };
    const team = await Team.findById(invitation.teamId).select('name description ownerId').lean() as TeamDetails | null;

    // Get inviter details
    const User = mongoose.model('User');
    type InviterInfo = { firstName?: string; lastName?: string; username?: string; email?: string };
    const inviter = await User.findById(invitation.inviterId).select('firstName lastName username email').lean() as InviterInfo | null;
    const inviterName = inviter?.firstName && inviter?.lastName 
      ? `${inviter.firstName} ${inviter.lastName}` 
      : inviter?.username || inviter?.email || 'Unknown';

    return res.status(200).json({
      success: true,
      data: {
        ...invitation,
        team: team ? {
          _id: team._id,
          name: team.name,
          description: team.description,
        } : null,
        inviterName,
      }
    });
  } catch (err) {
    logger.error(`getInvitationById error: ${err}`);
    return next(new CustomError('Failed to get invitation', 500));
  }
};

export const getPendingInvites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Owner or admin can see pending invites
    const teamId = req.team?.id;
    if (!teamId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Check if user is owner or admin
    const isOwner = team.ownerId === req.user._id;
    const membership = await TeamMember.findOne({ teamId, userId: req.user._id });
    const isAdmin = membership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(200).json({ success: true, data: [] });
    }

    const invites = await TeamInvitation.find({
      teamId: team._id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({ success: true, data: invites });
  } catch (err) {
    logger.error(`getPendingInvites error: ${err}`);
    return next(new CustomError('Failed to get pending invites', 500));
  }
};

export const getMyInvitations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userEmail = req.user.email?.toLowerCase();
    const userId = req.user._id;

    const invites = await TeamInvitation.find({
      $or: [
        { inviteeEmail: userEmail, status: 'pending' },
        { inviteeId: userId, status: 'pending' },
      ],
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean();

    // Populate team names
    const teamIds = [...new Set(invites.map(i => i.teamId))];
    const teams = await Team.find({ _id: { $in: teamIds } }).select('_id name').lean();
    const teamMap = new Map(teams.map(t => [String(t._id), t.name]));

    const enrichedInvites = invites.map(invite => ({
      ...invite,
      teamName: teamMap.get(invite.teamId) || 'Unknown Team',
    }));

    return res.status(200).json({ success: true, data: enrichedInvites });
  } catch (err) {
    logger.error(`getMyInvitations error: ${err}`);
    return next(new CustomError('Failed to get invitations', 500));
  }
};

export const acceptInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return next(new CustomError('Invitation not found', 404));
    }

    // Verify invitation is for this user
    const userEmail = req.user.email?.toLowerCase();
    if (invitation.inviteeEmail !== userEmail && invitation.inviteeId !== req.user._id) {
      return next(new CustomError('This invitation is not for you', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new CustomError(`Invitation already ${invitation.status}`, 400));
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return next(new CustomError('Invitation has expired', 400));
    }

    // Check if user already a member of this team
    const existingMembership = await TeamMember.findOne({
      teamId: invitation.teamId,
      userId: req.user._id,
    });
    if (existingMembership) {
      return next(new CustomError('You are already a member of this team', 400));
    }

    // Create TeamMember entry
    await TeamMember.create({
      teamId: invitation.teamId,
      userId: req.user._id,
      role: invitation.role,
      joinedAt: new Date(),
      invitedBy: invitation.inviterId,
    });

    // Update invitation status
    invitation.status = 'accepted';
    invitation.inviteeId = req.user._id;
    await invitation.save();

    const team = await Team.findById(invitation.teamId).select('name').lean() as { name: string } | null;
    logger.info(`User ${req.user._id} accepted invitation to team ${invitation.teamId}`);

    return res.status(200).json({ 
      success: true, 
      message: `You have joined ${team?.name || 'the team'}`,
      data: { teamId: invitation.teamId, role: invitation.role }
    });
  } catch (err) {
    logger.error(`acceptInvitation error: ${err}`);
    return next(new CustomError('Failed to accept invitation', 500));
  }
};

export const rejectInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return next(new CustomError('Invitation not found', 404));
    }

    // Verify invitation is for this user
    const userEmail = req.user.email?.toLowerCase();
    if (invitation.inviteeEmail !== userEmail && invitation.inviteeId !== req.user._id) {
      return next(new CustomError('This invitation is not for you', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new CustomError(`Invitation already ${invitation.status}`, 400));
    }

    invitation.status = 'rejected';
    await invitation.save();

    logger.info(`User ${req.user._id} rejected invitation ${id}`);
    return res.status(200).json({ success: true, message: 'Invitation rejected' });
  } catch (err) {
    logger.error(`rejectInvitation error: ${err}`);
    return next(new CustomError('Failed to reject invitation', 500));
  }
};

export const revokeInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return next(new CustomError('Invitation not found', 404));
    }

    // Owner or admin can revoke
    const team = await Team.findById(invitation.teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    const isOwner = team.ownerId === req.user._id;
    const membership = await TeamMember.findOne({ teamId: String(team._id), userId: req.user._id });
    const isAdmin = membership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return next(new CustomError('Only team owner or admins can revoke invitations', 403));
    }

    if (invitation.status !== 'pending') {
      return next(new CustomError(`Invitation already ${invitation.status}`, 400));
    }

    await TeamInvitation.findByIdAndDelete(id);

    logger.info(`Invitation ${id} revoked by ${req.user._id}`);
    return res.status(200).json({ success: true, message: 'Invitation revoked' });
  } catch (err) {
    logger.error(`revokeInvitation error: ${err}`);
    return next(new CustomError('Failed to revoke invitation', 500));
  }
};

export const getTeamSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team context from middleware
    const teamId = req.team?.id;
    
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }
    const team = await Team.findById(teamId).select('settings');
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }
    const settings: any = team.settings || {};
    const result: any = { ...settings };

    // Set default commentSeverity if not present (1 = MED)
    if (result.commentSeverity === undefined) {
      result.commentSeverity = 1;
    }

    // Populate model details if ObjectIds are present
    if (settings.defaultModelRepo) {
      try {
        const modelId = typeof settings.defaultModelRepo === 'string' 
          ? settings.defaultModelRepo 
          : String(settings.defaultModelRepo);
        const model = await AIModel.findById(modelId).select('_id name provider').lean() as IAIModel | null;
        if (model) {
          result.defaultModelRepo = String(model._id);
          result.defaultModelRepoName = model.name;
          result.defaultModelRepoProvider = model.provider;
        }
      } catch (err) {
        // Ignore errors, just don't populate
      }
    }

    if (settings.defaultModelPr) {
      try {
        const modelId = typeof settings.defaultModelPr === 'string' 
          ? settings.defaultModelPr 
          : String(settings.defaultModelPr);
        const model = await AIModel.findById(modelId).select('_id name provider').lean() as IAIModel | null;
        if (model) {
          result.defaultModelPr = String(model._id);
          result.defaultModelPrName = model.name;
          result.defaultModelPrProvider = model.provider;
        }
      } catch (err) {
        // Ignore errors, just don't populate
      }
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    next(new CustomError(error.message || 'Failed to get team settings', 500));
  }
};

export const updateTeamSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team context from middleware
    const teamId = req.team?.id;
    
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
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
      const m = await AIModel.findById(repoId).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelRepo = m._id;
      }
    } else if (typeof body.defaultModelRepo === 'string') {
      const m = await AIModel.findOne({ name: body.defaultModelRepo }).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelRepo = m._id;
      }
    }

    if (prId) {
      const m = await AIModel.findById(prId).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelPr = m._id;
      }
    } else if (typeof body.defaultModelPr === 'string') {
      const m = await AIModel.findOne({ name: body.defaultModelPr }).lean() as IAIModel | null;
      if (m) {
        nextSettings.defaultModelPr = m._id;
      }
    }

    // Handle commentSeverity (0=LOW, 1=MED, 2=HIGH)
    if (typeof body.commentSeverity === 'number' && [0, 1, 2].includes(body.commentSeverity)) {
      nextSettings.commentSeverity = body.commentSeverity;
    }

    // Handle prSummarySettings
    if (body.prSummarySettings && typeof body.prSummarySettings === 'object') {
      const currentPrSettings = nextSettings.prSummarySettings || {};
      nextSettings.prSummarySettings = {
        enabled: typeof body.prSummarySettings.enabled === 'boolean' ? body.prSummarySettings.enabled : currentPrSettings.enabled ?? true,
        sequenceDiagram: typeof body.prSummarySettings.sequenceDiagram === 'boolean' ? body.prSummarySettings.sequenceDiagram : currentPrSettings.sequenceDiagram ?? true,
        issueTables: typeof body.prSummarySettings.issueTables === 'boolean' ? body.prSummarySettings.issueTables : currentPrSettings.issueTables ?? true,
        impactAsessment: typeof body.prSummarySettings.impactAsessment === 'boolean' ? body.prSummarySettings.impactAsessment : currentPrSettings.impactAsessment ?? true,
        vibeCheckRap: typeof body.prSummarySettings.vibeCheckRap === 'boolean' ? body.prSummarySettings.vibeCheckRap : currentPrSettings.vibeCheckRap ?? false,
      };
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
    const { orgSlug, search, integration } = req.query;
  
    // Use team context from middleware
    const teamId = req.team?.id;

    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }

    type TeamInfo = ITeam & { _id: string };
    const team = await Team.findById(teamId).lean() as TeamInfo | null;
    if (!team) return next(new CustomError('Team not found', 404));

    // Build query for repositories matching this teamId
    let query: any = { teamId };
    
    // Filter by integration/source if provided
    if (integration && integration !== 'all' && typeof integration === 'string') {
      query.source = integration; // 'github' or 'bitbucket'
      logger.debug('Filtering repositories by integration', { integration, teamId });
    }
    
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
    // Get all teams user belongs to using helper
    const allTeams = await getAllUserTeams(req.user._id);

    const result = allTeams.map(t => ({
      _id: t.teamId,
      name: t.team.name,
      role: t.role,
      isOwner: t.isOwner,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error(`getMyTeams error: ${err}`);
    return next(new CustomError('Failed to fetch user teams', 500));
  }
};

export const getTeamInstallations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team context from middleware
    const teamId = req.team?.id;
    if (!teamId) {
      return next(new CustomError('Team context required', 400));
    }

    // Find all installations for the team in parallel
    const [githubInstallations, bitbucketWorkspaces] = await Promise.all([
      Github_Installation.find({ teamId }),
      Bitbucket_Workspace.find({ teamId })
    ]);

    if ((!githubInstallations || githubInstallations.length === 0) && 
        (!bitbucketWorkspaces || bitbucketWorkspaces.length === 0)) {
      return next(new CustomError('No installations found', 404));
    }

    // Extract account information from GitHub installations
    const githubAccounts = githubInstallations.map(installation => ({
      id: installation._id,
      login: installation.account.login,
      type: installation.account.type || 'Organization',
      avatarUrl: installation.account.avatarUrl || null,
      source: 'github'
    }));

    // Extract account information from Bitbucket workspaces
    const bitbucketAccounts = bitbucketWorkspaces.map(workspace => ({
      id: workspace._id,
      login: workspace.workspaceSlug, // Use slug for login
      type: workspace.account.type || 'workspace',
      avatarUrl: workspace.account.avatarUrl || null,
      source: 'bitbucket'
    }));

    // Combine accounts
    const allAccounts = [...githubAccounts, ...bitbucketAccounts];

    res.status(200).json({
      success: true,
      data: allAccounts
    });
  } catch (error) {
    logger.error(`getTeamInstallations error: ${error}`);
    return next(new CustomError('Failed to fetch team installations', 500));
  }
};

// Add repositories into a team
export const addReposInTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use team context from middleware
    const teamId = req.team?.id;
    
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }

    const { repoIds } = req.body as { repoIds: number[] };

    if (!Array.isArray(repoIds) || repoIds.length === 0) {
      return next(new CustomError('repoIds must be a non-empty array of repositoryId numbers', 400));
    }

    type TeamInfo = ITeam & { _id: string };
    const team = await Team.findById(teamId).lean() as TeamInfo | null;
    if (!team) return next(new CustomError('Team not found', 404));

    // Admin role check 
    if (!isTeamOwner(team, req.user._id)) {
      return next(new CustomError('Forbidden: not the team owner', 403));
    }

    // Ensure these repos belong to installations owned by team owner (same visibility scope as getTeamRepositories)
    const installations = await Github_Installation.find({ userId: team.ownerId }).select('_id');
    const installationIds = installations.map((ins) => ins._id);

    if (installationIds.length === 0) {
      return res.status(200).json({ success: true, data: [], message: 'No installations available for this team owner' });
    }

    // Update repositories: set teamId
    const result = await Github_Repository.updateMany(
      { repositoryId: { $in: repoIds }, github_installationId: { $in: installationIds } },
      { $set: { teamId } }
    );

    // Optionally fetch updated repos to return
    const updatedRepos = await Github_Repository.find({ repositoryId: { $in: repoIds } })
      .select('_id repositoryId fullName teamId')
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
        // Use team context from middleware
        const teamId = req.team?.id;

        if (!teamId) {
            return next(new CustomError('No team associated with this user', 400));
        }

        // Verify team exists and user has access
        type TeamInfo = ITeam & { _id: string };
        const team = await Team.findById(teamId).lean() as TeamInfo | null;
        if (!team) {
            return next(new CustomError('Team not found', 404));
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

        // Build daily total reviewed lines of code
        const buildDailyReviewedLinesOfCode = (items: any[]) => {
            const map: Record<string, number> = {};
            for (const item of items) {
                const created = new Date(item.createdAt);
                if (created < rangeStart || created > now) continue;
                if (item.status !== 'completed') continue;
                const key = formatDateKey(created);
                const lines = typeof item.reviewedLinesOfCode === 'number' ? item.reviewedLinesOfCode : 0;
                map[key] = (map[key] ?? 0) + lines;
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

        // Build daily average merge time for merged PRs
        const buildDailyAvgMergeTime = async (repoFullNames: string[]) => {
            if (repoFullNames.length === 0) {
                const out: { date: string; count: number }[] = [];
                for (let i = 0; i < days; i++) {
                    const d = new Date(rangeStart);
                    d.setDate(rangeStart.getDate() + i);
                    const key = formatDateKey(d);
                    out.push({ date: key, count: 0 });
                }
                return out;
            }

            try {
                const prCollection = mongoose.connection.db?.collection('pull_request_datas');
                if (!prCollection) return [];

                // Find all merged PRs for team's repositories within date range
                // We need to get the earliest document per prKey for accurate createdAt
                const mergedPRs = await prCollection.aggregate([
                    {
                        $match: {
                            'repository.name': { $in: repoFullNames },
                            state: 'merged',
                            mergedAt: { $exists: true },
                            createdAt: {
                                $gte: rangeStart,
                                $lte: now
                            }
                        }
                    },
                    {
                        // Group by prKey to find earliest createdAt
                        $group: {
                            _id: '$prKey',
                            earliestCreatedAt: { $min: '$createdAt' },
                            mergedAt: { $first: '$mergedAt' },
                            repository: { $first: '$repository' },
                            pr: { $first: '$pr' }
                        }
                    }
                ]).toArray();

                // Group by date and calculate average merge time
                const dayToMergeTimes: Record<string, number[]> = {};
                
                for (const prData of mergedPRs) {
                    if (!prData.mergedAt || !prData.earliestCreatedAt) continue;

                    const createdAt = new Date(prData.earliestCreatedAt);
                    const mergedAt = new Date(prData.mergedAt);
                    
                    // Calculate merge time in hours (from earliest commit to merge)
                    const mergeTimeHours = (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                    
                    // Only consider reasonable merge times (> 0 and < 30 days)
                    if (mergeTimeHours > 0 && mergeTimeHours < 720) {
                        const key = formatDateKey(createdAt);
                        if (!dayToMergeTimes[key]) dayToMergeTimes[key] = [];
                        dayToMergeTimes[key].push(mergeTimeHours);
                    }
                }

                const out: { date: string; count: number }[] = [];
                for (let i = 0; i < days; i++) {
                    const d = new Date(rangeStart);
                    d.setDate(rangeStart.getDate() + i);
                    const key = formatDateKey(d);
                    const mergeTimes = dayToMergeTimes[key] || [];
                    const avg = mergeTimes.length > 0
                        ? mergeTimes.reduce((sum, t) => sum + t, 0) / mergeTimes.length
                        : 0;
                    out.push({ date: key, count: Number(avg.toFixed(2)) });
                }
                return out;
            } catch (error) {
                console.error('Error calculating merge time:', error);
                return [];
            }
        };

        // Get all repositories that belong to this team (for count)
        const repositories = await Github_Repository.find({ teamId }).lean();

        // Get total repositories added to team
        const total_repo_added = repositories.length;

        // Get analyses split by type using teamId directly
        const fullRepoAnalyses = await Analysis.find({
            teamId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        const prAnalyses = await Analysis.find({
            teamId,
            analysis_type: 'pr_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all GitHub issues created for team repositories
        const repositoryIds = repositories.map(repo => repo._id);
        const githubIssues = await GithubIssue.find({
            github_repositoryId: { $in: repositoryIds },
            createdAt: { $gte: rangeStart, $lte: now }
        }).lean();

        // Get all pull requests created for team repositories
        const pullRequests = await GithubPullRequest.find({
            github_repositoryId: { $in: repositoryIds },
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
            teamId,
            analysis_type: 'full_repo_analysis',
            createdAt: { $gte: rangeStart, $lte: now }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('github_repositoryId', 'fullName defaultBranch')
        .lean();

        const recentPrAnalyses = await Analysis.find({
            teamId,
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
                analysis_id: String(analysis._id),
                errorLogs: analysis.errorLogs
            };
        });

        // Calculate merge time trends
        const repoFullNames = repositories.map(repo => repo.fullName);
        const daily_pr_merge_time_avg = await buildDailyAvgMergeTime(repoFullNames);

        // Calculate daily trends
        const daily_pr_reviews = buildDailyCounts(prAnalyses);
        const daily_pr_comments_avg = buildDailyAvgCommentsForUniquePRs(prAnalyses);
        const daily_reviewed_lines_of_code = buildDailyReviewedLinesOfCode(prAnalyses);

        // Calculate summary metrics (totals/averages across the entire period)
        const total_pr_reviews = daily_pr_reviews.reduce((sum, d) => sum + d.count, 0);
        
        const avg_merge_time_hours = daily_pr_merge_time_avg.length > 0
            ? daily_pr_merge_time_avg.reduce((sum, d) => sum + d.count, 0) / daily_pr_merge_time_avg.length
            : 0;
        
        const avg_comments_per_pr = daily_pr_comments_avg.length > 0
            ? daily_pr_comments_avg.reduce((sum, d) => sum + d.count, 0) / daily_pr_comments_avg.length
            : 0;
        
        const total_lines_reviewed = daily_reviewed_lines_of_code.reduce((sum, d) => sum + d.count, 0);

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
                daily_pr_reviews,
                daily_pr_comments_avg,
                daily_reviewed_lines_of_code,
                daily_pr_merge_time_avg,
                range_days: days,
                // Summary metrics
                total_pr_reviews,
                avg_merge_time_hours,
                avg_comments_per_pr,
                total_lines_reviewed
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


export const getTeamLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.team?.id;
    
    if (!teamId) {
      return next(new CustomError('No team associated with this user', 400));
    }

    // Verify team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return next(new CustomError('Team not found', 404));
    }

    // Pagination defaults
    const pageParam = (req.query.page as string) || "1";
    const limitParam = (req.query.limit as string) || "10";
    const page = Math.max(parseInt(pageParam, 10) || 1, 1);
    const limit = Math.max(parseInt(limitParam, 10) || 10, 1);
    
    // Date range filter - default to 7 days for efficiency
    const daysParam = (req.query.days as string) || "7";
    const days = parseInt(daysParam, 10) || 7;
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Search filter
    const search = ((req.query.search || req.query.q) as string) || "";

    // Access the pull_request_datas collection directly
    const prCollection = mongoose.connection.db?.collection('pull_request_datas');
    if (!prCollection) {
      return next(new CustomError('Database collection not available', 500));
    }

    // Aggregation pipeline to get leaderboard data
    const pipeline: any[] = [
      // Match PRs for this team within date range
      {
        $match: {
          teamId: teamId,
          skipped: { $ne: true },
          createdAt: { $gte: dateFilter }
        }
      },
      // Group by author username - use $max for name/avatar to get non-null values
      {
        $group: {
          _id: '$author.username',
          username: { $first: '$author.username' },
          // Use $max to prefer non-null values for name and avatar
          name: { $max: '$author.name' },
          avatar: { $max: '$author.avatar' },
          totalPRs: { $sum: 1 },
          // Count merged PRs (state can be 'closed' or 'merged')
          totalMerged: { 
            $sum: { 
              $cond: [{ $or: [{ $eq: ['$state', 'closed'] }, { $eq: ['$state', 'merged'] }] }, 1, 0] 
            } 
          },
          totalAdditions: { $sum: { $ifNull: ['$changes.summary.additions', 0] } },
          totalDeletions: { $sum: { $ifNull: ['$changes.summary.deletions', 0] } },
          totalCommits: { $sum: { $ifNull: ['$changes.summary.commits', 0] } },
          lastPRDate: { $max: '$createdAt' }
        }
      },
      // Calculate total lines and ensure name/avatar fallbacks
      {
        $addFields: {
          totalLinesCommitted: { $add: ['$totalAdditions', '$totalDeletions'] },
          // Fallback name to username if null/empty
          name: { $ifNull: ['$name', '$username'] },
          // Generate fallback avatar URL if null
          avatar: { 
            $ifNull: [
              '$avatar', 
              { $concat: ['https://ui-avatars.com/api/?name=', '$username', '&background=random'] }
            ] 
          }
        }
      }
    ];

    // Apply search filter if present (post-grouping to match user)
    if (search.trim()) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      pipeline.push({
        $match: {
          $or: [
            { username: { $regex: regex } },
            { name: { $regex: regex } }
          ]
        }
      });
    }

    // Sort with proper tiebreakers:
    // 1. Total PRs (most important)
    // 2. Lines reviewed/committed (secondary)
    // 3. PRs merged (tertiary)
    pipeline.push({
      $sort: {
        totalPRs: -1 as const,
        totalLinesCommitted: -1 as const,
        totalMerged: -1 as const
      }
    });

    // Get total count for pagination (before skip/limit)
    const countResult = await prCollection.aggregate([...pipeline, { $count: 'total' }]).toArray();
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit },
      // Project final shape (without rank - we'll add it in JS)
      {
        $project: {
          _id: 0,
          username: 1,
          name: 1,
          avatar: 1,
          totalPRs: 1,
          totalMerged: 1,
          totalAdditions: 1,
          totalDeletions: 1,
          totalLinesCommitted: 1,
          totalCommits: 1,
          lastPRDate: 1
        }
      }
    );

    const results = await prCollection.aggregate(pipeline).toArray();
    
    // Calculate rank based on position after sorting (accounting for pagination offset)
    const leaderboard = results.map((item, index) => ({
      ...item,
      rank: (page - 1) * limit + index + 1
    }));

    logger.info('Team leaderboard fetched', {
      teamId,
      page,
      limit,
      days,
      search,
      total,
      resultsCount: leaderboard.length
    });

    return res.status(200).json({
      success: true,
      data: leaderboard,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      }
    });
  } catch (error: any) {
    logger.error('Error getting team leaderboard:', error);
    return next(new CustomError(error.message || 'Failed to get team leaderboard', 500));
  }
};