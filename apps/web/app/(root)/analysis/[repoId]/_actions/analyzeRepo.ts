"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";

export const executeAnalysis = async (body: any) => {
  try {
    const { token } = await getAuthToken();

    const res = await fetch(`${_config.API_BASE_URL}/api/analysis/execute`, {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res;

    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${error.message}`);
    } else {
      throw new Error(
        `An unexpected error occurred while analyzing the repo.`
      );
    }
  }
};

