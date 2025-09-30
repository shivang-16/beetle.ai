"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { logger } from "@/lib/logger";

interface RepoSettingsUpdate {
  analysisType?: string;
  analysisFrequency?: string;
  analysisIntervalDays?: number;
  analysisRequired?: boolean;
  raiseIssues?: boolean;
  autoFixBugs?: boolean;
  trackGithubIssues?: boolean;
  trackGithubPullRequests?: boolean;
  customSettings?: Record<string, unknown>;
}

export const updateRepoSettings = async (
  repoId: string,
  settings: RepoSettingsUpdate
) => {
  try {
    const { token } = await getAuthToken();

    const url = `${_config.API_BASE_URL}/api/github/repository/${repoId}/settings`;

    const response = await fetch(url, {
      method: "PUT",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(settings),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update repository settings");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error updating repository settings", { 
      repoId, 
      settings,
      error: error instanceof Error ? error.message : error 
    });

    if (error instanceof Error) {
      throw new Error(`Failed to update repository settings: ${error.message}`);
    } else {
      throw new Error("An unexpected error occurred while updating repository settings");
    }
  }
};