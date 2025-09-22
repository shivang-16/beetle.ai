import { NextFunction, Request, Response } from "express";
import { getAuth, clerkClient } from '@clerk/express';
import User from "../models/user.model.js";
import Team from "../models/team.model.js";
import { createUser } from "../queries/user.queries.js";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      user?: any; 
      isServerRequest?: boolean;
      org?: { id: string; role?: string; slug?: string };
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
      const fieldsForDB = {
        _id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        firstName: clerkUser.firstName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress.split("@")[0],
        lastName: clerkUser.lastName,
        username: clerkUser.username || clerkUser.externalAccounts?.[0]?.username || clerkUser.id.split("_")[1],
        avatarUrl: clerkUser.imageUrl,
      }

      user = await createUser(fieldsForDB);
      logger.info(`New user created with username: ${user.username}`);
    } else {
      logger.info(`User found in DB: ${user.username}`);
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
