import { NextFunction, Request, Response } from "express";
import { getAuth, clerkClient } from '@clerk/express';
import User from "../models/user.model.js";
import { logError, logInfo, logTrace, logWarn } from "../utils/logger.js";
import { createUser } from "../queries/user.queries.js";

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
  logTrace("checkAuth middleware execution started");
  try {
    const { userId, orgId, orgRole, orgSlug } = getAuth(req);

    if (!userId) {
      logError("Authentication failed: No userId found in request.");
      return res.status(401).json({ message: 'Authentication required' });
    }

    const clerkUser = await clerkClient.users.getUser(userId);

    let user = await User.findById(userId);
    if (!user) {
      logInfo(`User not found in DB for clerkId: ${userId}. Creating new user.`);
      const fieldsForDB = {
        _id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username || clerkUser.externalAccounts?.[0]?.username,
        avatarUrl: clerkUser.imageUrl,
      }

      user = await createUser(fieldsForDB);
      logInfo(`New user created with username: ${user.username}`);
    } else {
      logInfo(`User found in DB: ${user.username}`);
    }
 
    req.user = user; // attach full user object for downstream handlers

    // Attach active organization context if present
    if (orgId) {
      req.org = { id: orgId, role: orgRole as string | undefined, slug: orgSlug as string | undefined };
      // Persist organizationId on user if changed
      if (user.organizationId !== orgId) {
        await User.updateOne({ _id: user._id }, { $set: { organizationId: orgId } });
        user.organizationId = orgId;
      }
    }
    logInfo(`User authenticated successfully: ${user.email}`);
    next();
  } catch (err) {
    logError(`Auth error: ${err}`);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
