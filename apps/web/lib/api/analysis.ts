import { _config } from "@/lib/_config";

export interface AnalysisRequest {
  github_repositoryId: string;
  branch?: string;
  teamId?: string;
  model?: string;
  prompt?: string;
  analysisId?: string; // Optional pre-created analysis ID
}

export const executeAnalysisStream = async (
  body: AnalysisRequest,
  token: string
): Promise<Response> => {
  const response = await fetch(`${_config.API_BASE_URL}/api/analysis/execute`, {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};