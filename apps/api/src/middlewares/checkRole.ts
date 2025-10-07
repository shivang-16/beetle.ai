
import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export const checkTeamMemberRole = (requiredRole: 'admin' | 'member' = 'admin') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`checkTeamRole middleware execution started for role: ${requiredRole}`);
    
    try {
      // Ensure user is authenticated
      if (!req.user) {
        logger.error("checkTeamRole: User not found in request. Ensure checkAuth middleware runs first.");
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get team context from request (set by checkAuth middleware)
      const teamId = req.team?.id;
      if (!teamId) {
        logger.error("checkTeamRole: Team context required but not found in request");
        return res.status(400).json({ message: 'Team context required' });
      }

      // Get user's role in the team
      const userRole = req.team?.role;
      if (!userRole) {
        logger.error(`checkTeamRole: User ${req.user._id} has no role in team ${teamId}`);
        return res.status(403).json({ message: 'Access denied: No role in team' });
      }

      // Check if user has required role
      if (requiredRole === 'admin' && userRole !== 'admin') {
        logger.warn(`checkTeamRole: User ${req.user._id} attempted admin action with role ${userRole} in team ${teamId}`);
        return res.status(403).json({ message: 'Access denied: Admin role required' });
      }

      logger.debug(`checkTeamRole: User ${req.user._id} has ${userRole} role in team ${teamId} - access granted`);
      next();
    } catch (err) {
      logger.error(`checkTeamRole error: ${err}`);
      res.status(500).json({ message: 'Internal server error during role check' });
    }
  };
};
