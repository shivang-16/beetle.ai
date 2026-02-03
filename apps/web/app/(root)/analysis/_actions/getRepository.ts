"use server";

import { apiGet } from "@/lib/api-client";
import { GithubRepository } from "@/types/types";
import { logger } from "@/lib/logger";

export const getRepository = async (
  query: string,
  orgSlug?: string,
  integration?: string
) => {
  try {
    // Build query params
    const params = new URLSearchParams();
    if (orgSlug) params.set("orgSlug", orgSlug);
    if (query) params.set("search", query);
    if (integration && integration !== "all") params.set("integration", integration);

    // Fetch repositories using team route - teamId is automatically included via headers
    const repoRes = await apiGet(
      `/api/team/repositories?${params.toString()}`,
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
      integration,
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
