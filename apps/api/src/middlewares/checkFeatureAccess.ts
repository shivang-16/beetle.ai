import { Request, Response, NextFunction } from "express";
import { FeatureAccessChecker, FeatureType, FeatureCheckResult } from "./helpers/checkAccessService.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware factory to check feature access based on subscription limits
 * Usage: checkFeatureAccess('maxAnalysisPerMonth')
 */
export const checkFeatureAccess = (
  featureType: FeatureType,
  options?: {
    allowPartial?: boolean; // If true, continues even if limit is reached but adds warning
    customErrorMessage?: string;
    additionalDataExtractor?: (req: Request) => any; // Function to extract additional data from request
  }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract additional data if extractor function is provided
      const additionalData = options?.additionalDataExtractor ? options.additionalDataExtractor(req) : {};

      console.log(additionalData, "here is teh additional data")
      // Check feature access
      const result: FeatureCheckResult = await FeatureAccessChecker.checkFeatureAccess(
        req, 
        featureType, 
        additionalData
      );

      // Attach result to request for downstream use
      req.featureCheck = result;

      // Log the feature check
      logger.debug(`Feature access check for ${featureType}`, {
        userId: req.user?._id,
        featureType,
        allowed: result.allowed,
        currentCount: result.currentCount,
        maxAllowed: result.maxAllowed,
        planName: result.planName
      });

      // If not allowed and not partial mode, return error
      if (!result.allowed && !options?.allowPartial) {
        const errorMessage = options?.customErrorMessage || result.message;
        
        return res.status(403).json({
          success: false,
          message: errorMessage,
          featureCheck: {
            featureType: result.featureType,
            currentCount: result.currentCount,
            maxAllowed: result.maxAllowed,
            remaining: result.remaining,
            planName: result.planName
          },
          upgradeRequired: true
        });
      }

      // If partial mode and limit reached, add warning but continue
      if (!result.allowed && options?.allowPartial) {
        logger.warn(`Feature limit reached but allowing partial access for ${featureType}`, {
          userId: req.user?._id,
          featureType,
          currentCount: result.currentCount,
          maxAllowed: result.maxAllowed
        });
      }

      next();
    } catch (error) {
      logger.error(`Error in checkFeatureAccess middleware for ${featureType}:`, error);
      return res.status(500).json({
        success: false,
        message: "Error checking feature access. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
};

/**
 * Middleware to check multiple features at once
 * Usage: checkMultipleFeatures(['maxProjects', 'maxAnalysisPerMonth'])
 */
export const checkMultipleFeatures = (
  features: FeatureType[],
  options?: {
    requireAll?: boolean; // If true, all features must be allowed
    customErrorMessage?: string;
    additionalDataExtractor?: (req: Request) => any;
  }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const additionalData = options?.additionalDataExtractor ? options.additionalDataExtractor(req) : {};

      // Check all features
      const results = await FeatureAccessChecker.checkMultipleFeatures(req, features, additionalData);

      // Attach results to request
      req.multipleFeatureChecks = results;

      // Determine if access should be allowed
      const allowedFeatures = Object.values(results).filter(result => result.allowed);
      const deniedFeatures = Object.values(results).filter(result => !result.allowed);

      const allAllowed = deniedFeatures.length === 0;
      const someAllowed = allowedFeatures.length > 0;

      // Log the checks
      logger.debug(`Multiple feature access check`, {
        userId: req.user?._id,
        features,
        allAllowed,
        someAllowed,
        allowedCount: allowedFeatures.length,
        deniedCount: deniedFeatures.length
      });

      // If requireAll is true and not all features are allowed
      if (options?.requireAll && !allAllowed) {
        const errorMessage = options?.customErrorMessage || 
          `Access denied. Required features not available: ${deniedFeatures.map(f => f.featureType).join(', ')}`;
        
        return res.status(403).json({
          success: false,
          message: errorMessage,
          featureChecks: results,
          upgradeRequired: true
        });
      }

      // If requireAll is false but no features are allowed
      if (!options?.requireAll && !someAllowed) {
        const errorMessage = options?.customErrorMessage || 
          "Access denied. None of the required features are available on your current plan.";
        
        return res.status(403).json({
          success: false,
          message: errorMessage,
          featureChecks: results,
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      logger.error(`Error in checkMultipleFeatures middleware:`, error);
      return res.status(500).json({
        success: false,
        message: "Error checking feature access. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
};

/**
 * Utility middleware to extract team ID from request for feature checking
 */
export const extractTeamId = (req: Request) => ({
  teamId: req.team?.id || req.headers['x-team-id'] || req.body.teamId || req.query.teamId
});

/**
 * Utility middleware to extract analysis data from request
 */
export const extractAnalysisData = (req: Request) => ({
  teamId: req.team?.id || req.headers['x-team-id'] || req.body.teamId || req.query.teamId,
  analysisType: req.body.analysisType || req.query.analysisType
});

/**
 * Pre-configured middleware for common use cases
 */
export const checkAnalysisAccess = checkFeatureAccess('maxAnalysisPerMonth', {
  additionalDataExtractor: extractAnalysisData,
  customErrorMessage: "You've reached your monthly analysis limit. Please upgrade your plan to run more analyses."
});

export const checkProjectAccess = checkFeatureAccess('maxProjects', {
  customErrorMessage: "You've reached your project limit. Please upgrade your plan to create more projects."
});

export const checkTeamAccess = checkFeatureAccess('maxTeams', {
  customErrorMessage: "You've reached your team limit. Please upgrade your plan to create more teams."
});

export const checkTeamMemberAccess = checkFeatureAccess('maxTeamMembers', {
  additionalDataExtractor: extractTeamId,
  customErrorMessage: "You've reached your team member limit. Please upgrade your plan to add more members."
});

export const checkPrioritySupportAccess = checkFeatureAccess('prioritySupport', {
  customErrorMessage: "Priority support is not available on your current plan. Please upgrade to access priority support."
});

// Extend Express Request interface to include feature check results
declare global {
  namespace Express {
    interface Request {
      featureCheck?: FeatureCheckResult;
      multipleFeatureChecks?: Record<FeatureType, FeatureCheckResult>;
    }
  }
}