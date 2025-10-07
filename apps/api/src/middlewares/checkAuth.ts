import { NextFunction, Request, Response } from "express";
import { getAuth, clerkClient } from '@clerk/express';
import User from "../models/user.model.js";
import Team from "../models/team.model.js";
import SubscriptionPlan from "../models/subscription_plan.model.js";
import { createUser, CreateUserData } from "../queries/user.queries.js";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      user?: any; 
      isServerRequest?: boolean;
      org?: { id: string; role?: string; slug?: string };
      team?: { id: string; role?: string; slug?: string };
      sub?: {
        planId: string;
        planName: 'free' | 'lite' | 'advance' | 'custom';
        status: 'active' | 'inactive' | 'cancelled' | 'free';
        features: {
          maxProjects: number;
          maxTeams: number;
          maxTeamMembers: number;
          maxAnalysisPerMonth: number;
          prioritySupport: boolean;
        };
        startDate?: Date;
        endDate?: Date;
      };
    }
  }
}

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  logger.info("checkAuth middleware execution started");
  try {
    const { userId, orgId, orgRole, orgSlug } = getAuth(req);
    logger.debug("Auth context extracted", { userId, orgId, orgRole, orgSlug });

    if (!userId) {
      logger.error("Authentication failed: No userId found in request.");
      return res.status(401).json({ message: 'Authentication required' });
    }

    const clerkUser = await clerkClient.users.getUser(userId);

    let user = await User.findById(userId);
    if (!user) {
      logger.warn(`User not found in DB for clerkId: ${userId}. Creating new user.`);

      // Fetch the free subscription plan
      const freePlan = await SubscriptionPlan.findOne({ name: 'free', isActive: true });
      if (!freePlan) {
        logger.error('Free subscription plan not found in database');
        return res.status(500).json({ message: 'System configuration error: Free plan not available' });
      }

      const userData: CreateUserData = {
        _id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        firstName: clerkUser.firstName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress.split("@")[0] || 'User',
        lastName: clerkUser.lastName || "",
        username: clerkUser.username || clerkUser.externalAccounts?.[0]?.username || clerkUser.id.split("_")[1],
        avatarUrl: clerkUser.imageUrl,
        subscriptionPlanId: freePlan._id,
        subscriptionStatus: 'free' as const,
        subscriptionStartDate: new Date(),
        // subscriptionEndDate is not set for free plan (unlimited)
      };

      user = await createUser(userData);
      logger.info(`New user created with username: ${user.username} and free subscription plan`);
    } else {
      logger.info(`User found in DB: ${user.username}`);
      
      // Check if existing user has subscription data, if not assign free plan
      if (!user.subscriptionPlanId || !user.subscriptionStatus) {
        logger.warn(`User ${user.username} missing subscription data. Assigning free plan.`);
        
        const freePlan = await SubscriptionPlan.findOne({ name: 'free', isActive: true });
        if (!freePlan) {
          logger.error('Free subscription plan not found in database');
          return res.status(500).json({ message: 'System configuration error: Free plan not available' });
        }

        // Update user with free subscription plan
        user.subscriptionPlanId = freePlan._id as any;
        user.subscriptionStatus = 'free';
        user.subscriptionStartDate = new Date();
        // subscriptionEndDate remains undefined for free plan
        
        await user.save();
        logger.info(`Updated user ${user.username} with free subscription plan`);
      } else {
        logger.debug("Attaching subscription data", { 
          subscriptionPlanId: user.subscriptionPlanId?.toString(),
          subscriptionStatus: user.subscriptionStatus 
        });
        
        try {
          // Handle case where subscriptionPlanId might be invalid or 'free' string
          let subscriptionPlan;
          
          if (user.subscriptionPlanId) {
            subscriptionPlan = await SubscriptionPlan.findById(new mongoose.Types.ObjectId(user.subscriptionPlanId.toString()));
          }
          
          // If no valid subscription plan found, assign free plan
          if (!subscriptionPlan) {
            logger.warn(`Invalid subscription plan ID for user ${user.username}. Assigning free plan.`);
            subscriptionPlan = await SubscriptionPlan.findOne({ name: 'free', isActive: true });
            
            if (subscriptionPlan) {
              // Update user with correct free plan ObjectId
              user.subscriptionPlanId = subscriptionPlan._id as any;
              user.subscriptionStatus = 'free';
              user.subscriptionStartDate = new Date();
              await user.save();
              logger.info(`Updated user ${user.username} with correct free subscription plan ObjectId`);
            }
          }
          
          if (subscriptionPlan) {
            req.sub = {
              planId: subscriptionPlan._id,
              planName: subscriptionPlan.name,
              status: user.subscriptionStatus || 'free',
              features: {
                maxProjects: subscriptionPlan.features.maxProjects,
                maxTeams: subscriptionPlan.features.maxTeams,
                maxTeamMembers: subscriptionPlan.features.maxTeamMembers,
                maxAnalysisPerMonth: subscriptionPlan.features.maxAnalysisPerMonth,
                prioritySupport: subscriptionPlan.features.prioritySupport,
              },
              startDate: user.subscriptionStartDate,
              endDate: user.subscriptionEndDate,
            };
            logger.debug(`Subscription data attached: ${subscriptionPlan.name} plan`);
          } else {
            logger.error('No subscription plan found, including free plan');
          }
        } catch (error) {
          logger.error(`Error fetching subscription plan: ${error}`);
          // Continue without subscription data if there's an error
        }
      }
    }
 
    req.user = user; // attach full user object for downstream handlers

    // Attach active organization context if present
    if (orgId) {
      req.org = { id: orgId, role: orgRole as string | undefined, slug: orgSlug as string | undefined };
      // Persist organizationId on user if changed


      // Ensure Team exists and membership is synced
      let team = await Team.findById(orgId);
      if (!team) {
        const org = await clerkClient.organizations.getOrganization({ organizationId: orgId });
        team = await Team.create({
          _id: orgId,
          name: org.name,
          description: '',
          slug: org.slug,
          ownerId: user._id,
          members: [{ userId: user._id, role: 'admin', joinedAt: new Date() }],
          settings: {},
        });
      }

      const role: 'admin' | 'member' = orgRole?.includes('admin')
        ? 'admin'
        : 'member';

      // Add or update team membership
      const memberIndex = team.members.findIndex((m: any) => m.userId === user._id);
      if (memberIndex === -1) {
        team.members.push({ userId: user._id, role, joinedAt: new Date() });
      } else if (team.members[memberIndex].role !== role) {
        team.members[memberIndex].role = role;
      }
      await team.save();

      // Sync user's teams array
      const hasTeam = Array.isArray(user.teams) && user.teams.some((t: any) => t._id === orgId);
      if (!hasTeam) {
        await User.updateOne(
          { _id: user._id },
          { $push: { teams: { _id: orgId, role } } }
        );
      }
    }

    // Handle team context from X-Team-Id header
    const teamIdFromHeader = req.headers['x-team-id'] as string;
    if (teamIdFromHeader) {
      logger.debug(`Team ID from header: ${teamIdFromHeader}`);
      
      // Verify user has access to this team
      const team = await Team.findById(teamIdFromHeader);
      if (team) {
        const member = team.members.find((m: any) => m.userId === user._id);
        if (member) {
          req.team = { 
            id: teamIdFromHeader, 
            role: member.role, 
            slug: team.slug 
          };
          logger.debug(`Team context set: ${team.name} (${member.role})`);
        } else {
          logger.warn(`User ${user._id} attempted to access team ${teamIdFromHeader} without membership`);
        }
      } else {
        logger.warn(`Team ${teamIdFromHeader} not found`);
      }
    }

 
    logger.info(`User authenticated successfully: ${user.email}`);
    next();
  } catch (err) {
    logger.error(`Auth error: ${err}`);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

export const checkSandboxAuth = async (req: Request, res: Response, next: NextFunction) => {
  logger.debug("checkSandboxAuth middleware execution started");
  try {
    const sandboxAuth = await mongoose.connection.db?.collection("auth_tokens").findOne({
      type: "sandbox",
    })
    if(!sandboxAuth) {
      logger.error("Authentication failed: No sandbox auth token found in DB.");
      return res.status(401).json({ message: 'Authentication required' });
    }
    const auth_token = sandboxAuth.auth_token
    logger.debug("Auth token extracted", { auth_token });

    const token = req.headers['x-sandbox-auth'];
    logger.debug("Token validation", { token, auth_token });
    if (!token || token !== auth_token) {
      logger.error("Authentication failed: Invalid sandbox auth token.");
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  } catch (err) {
    logger.error(`Auth error: ${err}`);
    res.status(401).json({ message: 'Unauthorized' });
  }
}


