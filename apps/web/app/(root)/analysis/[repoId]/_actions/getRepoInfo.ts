"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { GithubRepository, RepoInfo } from "@/types/types";

export const getRepoInfo = async (repoName: string) => {
  try {
    const { token } = await getAuthToken();
    const repoUrl = `https://github.com/${repoName}.git`;

    const res = await fetch(`${_config.API_BASE_URL}/api/github/info`, {
      method: "POST",
      body: JSON.stringify({ repoUrl }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data: { success: boolean; data: RepoInfo } = await res.json();

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${error.message}`);
    } else {
      throw new Error("An unexpected error occurred while fetching repo info.");
    }
  }
};
