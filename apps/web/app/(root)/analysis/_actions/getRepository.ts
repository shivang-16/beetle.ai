"use server";

import { apiGet } from "@/lib/api-client";
import { GithubRepository } from "@/types/types";
import { logger } from "@/lib/logger";

export const getRepository = async (
  query: string,
  scope: "user" | "team" = "team",
  teamIdFromClient?: string
) => {
  try {
    if (scope === "user") {
      const userRes = await apiGet(
        `/api/user/repositories?search=${query}`,
        {
          includeTeamId: false,
          cache: "force-cache",
          next: { tags: ["repository_list", "user"] },
        }
      );

      const grouped: { success: boolean; data: Record<string, GithubRepository[]> } =
        await userRes.json();

      const flat: GithubRepository[] = Object.values(grouped.data || {}).flat();
      return { success: true, data: flat };
    }

    // Team scope - now the backend will get teamId from headers automatically


    const repoRes = await apiGet(
      `/api/team/repositories?search=${query}`,
      {
        cache: "force-cache",
        next: { tags: ["repository_list"] },
      }
    );

    const data: { success: boolean; data: GithubRepository[] } = await repoRes.json();
    return data;
  } catch (error) {
    logger.error("Failed to fetch repositories", { 
      query, 
      scope, 
      teamId: teamIdFromClient,
      error: error instanceof Error ? error.message : error 
    });

    if (error instanceof Error) {
      logger.error("Repository fetch error details", { 
        message: error.message,
        stack: error.stack 
      });

      throw new Error(`${error.message}`);
    } else {
      throw new Error(
        "An unexpected error occurred while fetching the repositories"
      );
    }
  }
};
