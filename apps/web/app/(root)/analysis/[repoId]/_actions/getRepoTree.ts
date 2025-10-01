"use server";

import { apiGet } from "@/lib/api-client";
import { RepoTree } from "@/types/types";

export const getRepoTree = async (repoId: string, teamId?: string, branch?: string) => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set('github_repositoryId', repoId);
    if (teamId) {
      searchParams.set('teamId', teamId);
    }
    if (branch) {
      searchParams.set('branch', branch);
    }

    const res = await apiGet(`/api/github/tree?${searchParams.toString()}`, {
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
