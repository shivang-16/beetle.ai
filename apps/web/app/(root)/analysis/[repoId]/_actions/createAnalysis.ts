"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { logger } from "@/lib/logger";
import { revalidateTag } from "next/cache";

export interface CreateAnalysisParams {
  github_repositoryId: string;
  branch?: string;
  teamId?: string;
  model?: string;
  prompt?: string;
}

export interface CreateAnalysisResult {
  success: boolean;
  analysisId?: string;
  error?: string;
}

export const createAnalysisRecord = async (params: CreateAnalysisParams): Promise<CreateAnalysisResult> => {
  try {
    const { token } = await getAuthToken();

    const response = await fetch(`${_config.API_BASE_URL}/api/analysis/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        github_repositoryId: params.github_repositoryId,
        branch: params.branch,
        teamId: params.teamId,
        model: params.model || "gemini-2.0-flash",
        prompt: params.prompt || "Analyze this codebase for security vulnerabilities and code quality",
        analysis_type: "full_repo_analysis",
        status: "running"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error("Failed to create analysis record", { 
        status: response.status,
        error: errorData 
      });
      return {
        success: false,
        error: `Failed to create analysis record: ${response.status}`
      };
    }

    const result = await response.json();
    
    if (result.success && result.data?.analysisId) {
      // Revalidate the analysis list to show the new running analysis
      revalidateTag("analysis");
      revalidateTag(`analysis-${params.github_repositoryId}`);
      
      logger.info("Analysis record created successfully", { 
        analysisId: result.data.analysisId,
        github_repositoryId: params.github_repositoryId 
      });
      
      return {
        success: true,
        analysisId: result.data.analysisId
      };
    } else {
      logger.error("Invalid response from create analysis API", { result });
      return {
        success: false,
        error: "Invalid response from server"
      };
    }
  } catch (error) {
    logger.error("Error creating analysis record", { 
      error: error instanceof Error ? error.message : error,
      params 
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};