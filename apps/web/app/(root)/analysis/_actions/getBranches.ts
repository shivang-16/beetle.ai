"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";

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

    const url = `${_config.API_BASE_URL}/api/github/branches?github_repositoryId=${repositoryId}${teamId ? `&teamId=${teamId}` : ''}`;

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
    console.error("Error fetching branches:", error);

    if (error instanceof Error) {
      throw new Error(`Failed to fetch branches: ${error.message}`);
    } else {
      throw new Error("An unexpected error occurred while fetching branches");
    }
  }
};