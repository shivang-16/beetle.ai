"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { GithubRepository } from "@/types/types";
import { logger } from "@/lib/logger";

export const getRepository = async (
  query: string,
  scope: "user" | "team" = "team",
  teamIdFromClient?: string
) => {
  try {
    const { token } = await getAuthToken();

    if (scope === "user") {
      const userRes = await fetch(
        `${_config.API_BASE_URL}/api/user/repositories?search=${query}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "force-cache",
          next: { tags: ["repository_list", "user"] },
        }
      );

      const grouped: { success: boolean; data: Record<string, GithubRepository[]> } =
        await userRes.json();

      const flat: GithubRepository[] = Object.values(grouped.data || {}).flat();
      return { success: true, data: flat };
    }

    // Team scope
    let teamId = teamIdFromClient;
    if (!teamId) {
      const res = await fetch(`${_config.API_BASE_URL}/api/team/current`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const teamData: { success: boolean; data: { _id: string } } = await res.json();
      teamId = teamData?.data?._id;
    }

    const repoRes = await fetch(
      `${_config.API_BASE_URL}/api/team/${teamId}/repositories?search=${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "force-cache",
        next: { tags: ["repository_list", teamId || "team"] },
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
