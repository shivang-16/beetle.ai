import mongoose from 'mongoose';
import Analysis from '../../models/analysis.model.js';
import { logger } from '../../utils/logger.js';

/**
 * Skipped Analysis Helpers
 * Common utilities for creating skipped analysis records
 */

export interface SkippedAnalysisParams {
  userId: string;
  teamId?: string;
  repoUrl: string;
  repositoryId: string;
  prNumber: number;
  prUrl: string;
  prTitle: string;
  skipReason: string;
  repositoryFullName: string;
}

/**
 * Create a skipped analysis record in the database
 * Used when PR analysis is skipped for various reasons (bot author, daily limit, etc.)
 */
export const createSkippedAnalysis = async (params: SkippedAnalysisParams): Promise<string | null> => {
  try {
    const analysisId = new mongoose.Types.ObjectId().toString();
    
    const createPayload: any = {
      _id: analysisId,
      analysis_type: "pr_analysis",
      userId: params.userId,
      teamId: params.teamId || undefined,
      repoUrl: params.repoUrl,
      github_repositoryId: params.repositoryId,
      sandboxId: "",
      model: "skipped",
      prompt: "Skipped - " + params.skipReason,
      status: "skipped",
      pr_number: params.prNumber,
      pr_url: params.prUrl,
      pr_title: params.prTitle,
      errorLogs: params.skipReason,
    };
    
    await Analysis.create(createPayload);
    logger.info("Created skipped analysis record", { 
      analysisId, 
      repo: params.repositoryFullName, 
      prNumber: params.prNumber,
      skipReason: params.skipReason
    });
    return analysisId;
  } catch (err) {
    logger.warn("Failed to create skipped analysis record", { 
      error: err instanceof Error ? err.message : err 
    });
    return null;
  }
};
