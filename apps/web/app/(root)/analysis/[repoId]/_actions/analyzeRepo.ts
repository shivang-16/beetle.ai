"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";

export const analyzeRepo = async (repoName: string) => {
  try {
    const { token } = await getAuthToken();

    const repoUrl = `https://github.com/${repoName}.git`;

    const res = await fetch(`${_config.API_BASE_URL}/api/analysis/execute`, {
      method: "POST",
      body: JSON.stringify({ repoUrl }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.text();

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${error.message}`);
    } else {
      throw new Error(
        `An unexpected error occurred while analyzing the repo ${repoName}.`
      );
    }
  }
};
