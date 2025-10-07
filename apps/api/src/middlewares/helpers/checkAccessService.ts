import { Request } from "express";
import User from "../../models/user.model.js";
import Team from "../../models/team.model.js";
import Analysis from "../../models/analysis.model.js";
import { Github_Repository } from "../../models/github_repostries.model.js";
import { logger } from "../../utils/logger.js";

export type FeatureType = 
  | 'maxProjects' 
  | 'maxTeams' 
  | 'maxTeamMembers' 
  | 'maxAnalysisPerMonth' 
  | 'prioritySupport';

export interface FeatureCheckResult {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  remaining: number;
  message: string;
  featureType: FeatureType;
  planName?: string;
}

export class FeatureAccessChecker {
  
  /**
   * Check if user can access a specific feature based on their subscription
   */
  static async checkFeatureAccess(
    req: Request, 
    featureType: FeatureType, 
    additionalData?: any
  ): Promise<FeatureCheckResult> {
    const subscription = req.sub;
    const userId = req.user?._id;


    console.log("subscription", subscription)
    if (!subscription) {
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        remaining: 0,
        message: "No subscription found. Please upgrade to access this feature.",
        featureType
      };
    }

    if (!userId) {
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        remaining: 0,
        message: "User authentication required.",
        featureType
      };
    }

    console.log(featureType, "entering switch case")
    try {
      switch (featureType) {
        case 'maxProjects':
          return await this.checkProjectLimit(userId, subscription.features.maxProjects, subscription.planName);
        
        case 'maxTeams':
          return await this.checkTeamLimit(userId, subscription.features.maxTeams, subscription.planName);
        
        case 'maxTeamMembers':
          return await this.checkTeamMemberLimit(userId, subscription.features.maxTeamMembers, subscription.planName, additionalData?.teamId);
        
        case 'maxAnalysisPerMonth':
          return await this.checkAnalysisLimit(userId, subscription.features.maxAnalysisPerMonth, subscription.planName, additionalData?.teamId);
        
        case 'prioritySupport':
          return this.checkPrioritySupport(subscription.features.prioritySupport, subscription.planName);
        
        default:
          return {
            allowed: false,
            currentCount: 0,
            maxAllowed: 0,
            remaining: 0,
            message: "Unknown feature type.",
            featureType,
            planName: subscription.planName
          };
      }
    } catch (error) {
      logger.error(`Error checking feature access for ${featureType}:`, error);
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        remaining: 0,
        message: "Error checking feature access. Please try again.",
        featureType,
        planName: subscription.planName
      };
    }
  }

  /**
   * Check project creation limit
   */
  private static async checkProjectLimit(
    userId: string, 
    maxProjects: number, 
    planName: string
  ): Promise<FeatureCheckResult> {
    // Count user's repositories (projects)
    const currentCount = await Github_Repository.countDocuments({ 
      $or: [
        { ownerId: userId },
        { collaborators: userId }
      ]
    });

    const remaining = Math.max(0, maxProjects - currentCount);
    const allowed = currentCount < maxProjects;

    return {
      allowed,
      currentCount,
      maxAllowed: maxProjects,
      remaining,
      message: allowed 
        ? `You can create ${remaining} more projects on your ${planName} plan`
        : `You've reached your project limit (${maxProjects}) on your ${planName} plan. Please upgrade to create more projects.`,
      featureType: 'maxProjects',
      planName
    };
  }

  /**
   * Check team creation limit
   */
  private static async checkTeamLimit(
    userId: string, 
    maxTeams: number, 
    planName: string
  ): Promise<FeatureCheckResult> {
    // Count teams owned by user
    const currentCount = await Team.countDocuments({ ownerId: userId });

    const remaining = Math.max(0, maxTeams - currentCount);
    const allowed = currentCount < maxTeams;

    return {
      allowed,
      currentCount,
      maxAllowed: maxTeams,
      remaining,
      message: allowed 
        ? `You can create ${remaining} more teams on your ${planName} plan`
        : `You've reached your team limit (${maxTeams}) on your ${planName} plan. Please upgrade to create more teams.`,
      featureType: 'maxTeams',
      planName
    };
  }

  /**
   * Check team member limit for a specific team
   */
  private static async checkTeamMemberLimit(
    userId: string, 
    maxTeamMembers: number, 
    planName: string,
    teamId?: string
  ): Promise<FeatureCheckResult> {
    if (!teamId) {
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: maxTeamMembers,
        remaining: 0,
        message: "Team ID required to check member limit.",
        featureType: 'maxTeamMembers',
        planName
      };
    }

    // Find the team and check if user is owner
    const team = await Team.findById(teamId);
    if (!team || team.ownerId !== userId) {
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: maxTeamMembers,
        remaining: 0,
        message: "You can only add members to teams you own.",
        featureType: 'maxTeamMembers',
        planName
      };
    }

    const currentCount = team.members?.length || 0;
    const remaining = Math.max(0, maxTeamMembers - currentCount);
    const allowed = currentCount < maxTeamMembers;

    return {
      allowed,
      currentCount,
      maxAllowed: maxTeamMembers,
      remaining,
      message: allowed 
        ? `You can add ${remaining} more members to this team on your ${planName} plan`
        : `You've reached your team member limit (${maxTeamMembers}) on your ${planName} plan. Please upgrade to add more members.`,
      featureType: 'maxTeamMembers',
      planName
    };
  }

  /**
   * Check monthly analysis limit
   */
  private static async checkAnalysisLimit(
    userId: string, 
    maxAnalysisPerMonth: number, 
    planName: string,
    teamId?: string
  ): Promise<FeatureCheckResult> {
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log("here inside check analysis limit", userId, maxAnalysisPerMonth, planName, teamId)
    // Count analyses created this month
    const query: any = {
      userId: userId,
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    };

    // If teamId is provided, also count team analyses
    if (teamId) {
      const team = await Team.findById(teamId);
      if (team && team.ownerId === userId) {
        // For team owner, count all team analyses
        query.$or = [
          { userId: userId },
          { userId: team.ownerId }
        ];
      }
    }

    const currentCount = await Analysis.countDocuments(query);
    console.log(currentCount, maxAnalysisPerMonth, "====> here is the currnet and max coutns")

    const remaining = Math.max(0, maxAnalysisPerMonth - currentCount);
    const allowed = currentCount < maxAnalysisPerMonth;

    return {
      allowed,
      currentCount,
      maxAllowed: maxAnalysisPerMonth,
      remaining,
      message: allowed 
        ? `You can run ${remaining} more analyses this month on your ${planName} plan`
        : `You've reached your monthly analysis limit (${maxAnalysisPerMonth}) on your ${planName} plan. Please upgrade or wait until next month.`,
      featureType: 'maxAnalysisPerMonth',
      planName
    };
  }

  /**
   * Check priority support access
   */
  private static checkPrioritySupport(
    hasPrioritySupport: boolean, 
    planName: string
  ): FeatureCheckResult {
    return {
      allowed: hasPrioritySupport,
      currentCount: hasPrioritySupport ? 1 : 0,
      maxAllowed: 1,
      remaining: hasPrioritySupport ? 0 : 1,
      message: hasPrioritySupport 
        ? `Priority support is available on your ${planName} plan`
        : `Priority support is not available on your ${planName} plan. Please upgrade to access priority support.`,
      featureType: 'prioritySupport',
      planName
    };
  }

  /**
   * Check multiple features at once
   */
  static async checkMultipleFeatures(
    req: Request, 
    features: FeatureType[], 
    additionalData?: any
  ): Promise<Record<FeatureType, FeatureCheckResult>> {
    const results: Record<string, FeatureCheckResult> = {};

    for (const feature of features) {
      results[feature] = await this.checkFeatureAccess(req, feature, additionalData);
    }

    return results as Record<FeatureType, FeatureCheckResult>;
  }
}