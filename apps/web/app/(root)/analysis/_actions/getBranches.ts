"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { logger } from "@/lib/logger";

interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export const getBranches = async (
  repositoryId: string,
  teamId?: string
) => {
  try {
    const { token } = await getAuthToken();
    console.log(token);

    const url = `${_config.API_BASE_URL}/api/github/branches?github_repositoryId=${repositoryId}${teamId ? `&teamId=${teamId}` : ''}`;
    console.log(url);
    const response = await fetch(url, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store", // Don't cache branches as they can change frequently
    });


    const data: { success: boolean; data: Branch[]; message?: string } = await response.json();
    return data;
  } catch (error) {
    logger.error("Error fetching branches", { 
      repositoryId, 
      teamId,
      error: error instanceof Error ? error.message : error 
    });

    if (error instanceof Error) {
      throw new Error(`Failed to fetch branches: ${error.message}`);
    } else {
      throw new Error("An unexpected error occurred while fetching branches");
    }
  }
};