"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { logger } from "@/lib/logger";

interface RepoSettings {
  _id: string;
  fullName: string;
  analysisType: string;
  analysisFrequency: string;
  analysisIntervalDays?: number;
  analysisRequired: boolean;
  raiseIssues: boolean;
  autoFixBugs: boolean;
  trackGithubIssues: boolean;
  trackGithubPullRequests: boolean;
  customSettings: Record<string, unknown>;
}

export const getRepoSettings = async (repoId: string) => {
  try {
    const { token } = await getAuthToken();

    const url = `${_config.API_BASE_URL}/api/github/repository/${repoId}/settings`;

    const response = await fetch(url, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store", // Don't cache settings as they can change
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to fetch repository settings");
    }

    const data: { success: boolean; data: RepoSettings; message?: string } = await response.json();
    return data;
  } catch (error) {
    logger.error("Error fetching repository settings", { 
      repoId,
      error: error instanceof Error ? error.message : error 
    });

    if (error instanceof Error) {
      throw new Error(`Failed to fetch repository settings: ${error.message}`);
    } else {
      throw new Error("An unexpected error occurred while fetching repository settings");
    }
  }
};