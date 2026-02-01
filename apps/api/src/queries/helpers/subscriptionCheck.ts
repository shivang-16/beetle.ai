import mongoose from 'mongoose';
import User from '../../models/user.model.js';
import SubscriptionPlan from '../../models/subscription_plan.model.js';
import { FeatureAccessChecker } from '../../middlewares/helpers/checkAccessService.js';
import { logger } from '../../utils/logger.js';

/**
 * Subscription and Limit Checking Helpers
 * Common utilities for checking PR analysis limits based on subscription plans
 */

export interface SubscriptionCheckResult {
  allowed: boolean;
  planName?: string;
  currentCount?: number;
  maxAllowed?: number;
}

/**
 * Get user's subscription plan, falling back to free plan if not found
 */
export const getUserSubscriptionPlan = async (userId: string): Promise<any> => {
  try {
    const user = await User.findById(userId);
    let subscriptionPlan = null as any;

    if (user?.subscriptionPlanId) {
      try {
        subscriptionPlan = await SubscriptionPlan.findById(
          new mongoose.Types.ObjectId(user.subscriptionPlanId.toString())
        );
      } catch (e) {
        subscriptionPlan = null;
      }
    }
    
    if (!subscriptionPlan) {
      subscriptionPlan = await SubscriptionPlan.findOne({ 
        name: 'free', 
        isActive: true 
      });
    }

    return { user, subscriptionPlan };
  } catch (error) {
    logger.error("Error fetching user subscription plan", { 
      error: error instanceof Error ? error.message : error,
      userId 
    });
    return { user: null, subscriptionPlan: null };
  }
};

/**
 * Build subscription object for feature access checking
 */
export const buildSubscriptionObject = (user: any, subscriptionPlan: any) => {
  return {
    planId: subscriptionPlan._id,
    planName: subscriptionPlan.name,
    status: user.subscriptionStatus || 'free',
    features: {
      maxTeams: subscriptionPlan.features.maxTeams,
      maxTeamMembers: subscriptionPlan.features.maxTeamMembers,
      maxPrAnalysisPerDay: (subscriptionPlan.features as any).maxPrAnalysisPerDay ?? 5,
      maxFullRepoAnalysisPerDay: (subscriptionPlan.features as any).maxFullRepoAnalysisPerDay ?? 2,
      prioritySupport: subscriptionPlan.features.prioritySupport,
      organizationSupport: (subscriptionPlan.features as any).organizationSupport ?? 
        (subscriptionPlan.name === 'lite' || subscriptionPlan.name === 'advance'),
    },
    startDate: user.subscriptionStartDate,
    endDate: user.subscriptionEndDate,
  };
};

/**
 * Check if user has reached daily PR analysis limit
 */
export const checkDailyPrAnalysisLimit = async (userId: string): Promise<SubscriptionCheckResult> => {
  try {
    const { user, subscriptionPlan } = await getUserSubscriptionPlan(userId);
    
    if (!user || !subscriptionPlan) {
      logger.warn("Could not fetch user or subscription plan for limit check", { userId });
      return { allowed: true }; // Allow if we can't check (fail open)
    }

    const sub = buildSubscriptionObject(user, subscriptionPlan);
    const fakeReq: any = { sub, user: { _id: user._id } };
    const featureResult = await FeatureAccessChecker.checkFeatureAccess(
      fakeReq, 
      'maxPrAnalysisPerDay'
    );

    return {
      allowed: featureResult.allowed,
      planName: featureResult.planName,
      currentCount: featureResult.currentCount,
      maxAllowed: featureResult.maxAllowed,
    };
  } catch (error) {
    logger.warn("Failed to perform PR analysis daily limit check", { 
      error: error instanceof Error ? error.message : error,
      userId 
    });
    return { allowed: true }; // Fail open - don't block if check fails
  }
};
