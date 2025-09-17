"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { AnalysisItem } from "@/types/types";
import { revalidateTag } from "next/cache";

export const getAnalysisWithId = async (repoId: string) => {
  try {
    const { token } = await getAuthToken();

    const res = await fetch(`${_config.API_BASE_URL}/api/analysis/${repoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: {
        tags: ["analysis", repoId],
      },
    });
    const json = await res.json();
    const list: AnalysisItem[] = Array.isArray(json?.data) ? json.data : [];

    return list;
  } catch (error) {
    console.log("Failed to fetch analysis: ", error);
  }
};

export const refreshAnalysisList = async (repoId: string) => {
  revalidateTag("analysis");
  revalidateTag(repoId);
};
