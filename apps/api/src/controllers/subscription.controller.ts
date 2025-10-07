import { Request, Response } from "express";
import { logger } from "../utils/logger.js";

/**
 * Test endpoint to demonstrate accessing subscription features
 * This shows how to use req.sub to access user's subscription data
 */
export const getSubscriptionFeatures = async (req: Request, res: Response) => {
  try {
    // Access subscription data from req.sub (set by checkAuth middleware)
    const subscription = req.sub;

    if (!subscription) {
      return res.status(200).json({
        message: "No subscription data available",
        hasSubscription: false,
        defaultFeatures: {
          maxProjects: 1,
          maxTeams: 0,
          maxTeamMembers: 1,
          maxAnalysisPerMonth: 5,
          prioritySupport: false,
        }
      });
    }

    // Example of how to use subscription features in your business logic
    const canCreateProject = (currentProjectCount: number) => {
      return currentProjectCount < subscription.features.maxProjects;
    };

    const canCreateTeam = (currentTeamCount: number) => {
      return currentTeamCount < subscription.features.maxTeams;
    };

    const canRunAnalysis = (currentMonthAnalysisCount: number) => {
      return currentMonthAnalysisCount < subscription.features.maxAnalysisPerMonth;
    };

    logger.info(`Subscription features accessed for plan: ${subscription.planName}`);

    return res.status(200).json({
      message: "Subscription features retrieved successfully",
      hasSubscription: true,
      subscription: {
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        features: subscription.features,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
      // Example usage functions
      examples: {
        canCreateProject: canCreateProject(0), // Example with 0 current projects
        canCreateTeam: canCreateTeam(0), // Example with 0 current teams
        canRunAnalysis: canRunAnalysis(0), // Example with 0 current analysis
      }
    });
  } catch (error) {
    logger.error(`Error retrieving subscription features: ${error}`);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Example of checking subscription limits in business logic
 */
export const checkProjectCreationLimit = async (req: Request, res: Response) => {
  try {
    const subscription = req.sub;
    const { currentProjectCount } = req.body;

    if (!subscription) {
      return res.status(403).json({
        message: "No subscription found. Please upgrade to create projects.",
        canCreate: false
      });
    }

    const canCreate = currentProjectCount < subscription.features.maxProjects;
    const remaining = Math.max(0, subscription.features.maxProjects - currentProjectCount);

    return res.status(200).json({
      canCreate,
      currentCount: currentProjectCount,
      maxAllowed: subscription.features.maxProjects,
      remaining,
      planName: subscription.planName,
      message: canCreate 
        ? `You can create ${remaining} more projects on your ${subscription.planName} plan`
        : `You've reached your project limit (${subscription.features.maxProjects}) on your ${subscription.planName} plan. Please upgrade to create more projects.`
    });
  } catch (error) {
    logger.error(`Error checking project creation limit: ${error}`);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};