import { NextFunction, Request, Response } from "express";
import { getAuth, clerkClient } from '@clerk/express';
import User from "../models/user.model.js";
import { logError, logInfo, logTrace, logWarn } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      user?: any; 
      isServerRequest?: boolean;
    }
  }
}

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  logTrace("checkAuth middleware execution started");
  try {
    const { userId } = getAuth(req);

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
        avatarUrl: clerkUser.imageUrl,
      }

      user = new User(fieldsForDB);
      await user.save();
      logInfo(`New user created with username: ${user.email}`);
    } else {
      logInfo(`User found in DB: ${user.email}`);
    }
 
    req.user = user; // attach full user object for downstream handlers
    logInfo(`User authenticated successfully: ${user.email}`);
    next();
  } catch (err) {
    logError(`Auth error: ${err}`);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
