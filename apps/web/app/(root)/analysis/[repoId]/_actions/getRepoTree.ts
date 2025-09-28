"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { RepoTree } from "@/types/types";

export const getRepoTree = async (repoId: string, teamId?: string, branch?: string) => {
  try {
    const { token } = await getAuthToken();

    const url = new URL(`${_config.API_BASE_URL}/api/github/tree`);
    url.searchParams.set('github_repositoryId', repoId);
    if (teamId) {
      url.searchParams.set('teamId', teamId);
    }
    if (branch) {
      url.searchParams.set('branch', branch);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: {
        tags: [`repo-tree-${repoId}`, `repo-tree-${repoId}-${branch || 'main'}`],
        revalidate: 300, // Cache for 5 minutes
      },
    });

    const data: { success: boolean; data: RepoTree } = await res.json();

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${error.message}`);
    } else {
      throw new Error("An unexpected error occurred while fetching repo tree.");
    }
  }
};
