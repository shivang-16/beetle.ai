"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { AnalysisItem } from "@/types/types";
import { logger } from "@/lib/logger";
import { revalidateTag } from "next/cache";

export const getAnalysisWithId = async (repoId: string) => {
  try {
    const { token } = await getAuthToken();

    const res = await fetch(`${_config.API_BASE_URL}/api/analysis/${repoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        tags: ["analysis", `analysis-${repoId}`],
      },
    });
    const json = await res.json();
    const list: AnalysisItem[] = Array.isArray(json?.data) ? json.data : [];

    return list;
  } catch (error) {
    logger.error("Failed to fetch analysis", { 
      repoId, 
      error: error instanceof Error ? error.message : error 
    });
  }
};

export const refreshAnalysisList = async (repoId: string) => {
  revalidateTag("analysis");
  // Only revalidate the specific analysis tag, not the entire repoId which affects repo tree
  revalidateTag(`analysis-${repoId}`);
};
