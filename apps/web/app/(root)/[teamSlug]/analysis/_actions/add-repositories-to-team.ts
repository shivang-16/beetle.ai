"use server";

import { apiPost } from "@/lib/api-client";
import { logger } from "@/lib/logger";

interface AddRepositoriesResponse {
  success: boolean;
  data?: {
    matchedCount: number;
    modifiedCount: number;
    repos: Array<{
      _id: string;
      repositoryId: number;
      fullName: string;
      teams: string[];
    }>;
  };
  error?: string;
}

export async function addRepositoriesToTeam(repoIds: number[]): Promise<AddRepositoriesResponse> {
  try {
    logger.info("Adding repositories to team", { repoIds });

    if (!Array.isArray(repoIds) || repoIds.length === 0) {
      return {
        success: false,
        error: "Repository IDs must be a non-empty array"
      };
    }

    const response = await apiPost("/api/team/repositories/add", {
      repoIds
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error("Failed to add repositories to team", { 
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    logger.info("Successfully added repositories to team", { 
      matchedCount: data.data?.matchedCount,
      modifiedCount: data.data?.modifiedCount
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error("Error adding repositories to team", { 
      error: error instanceof Error ? error.message : error,
      repoIds
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}