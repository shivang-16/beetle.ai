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
  token: string,
  teamId?: string
): Promise<Response> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Add team ID header if available
  if (teamId) {
    headers['X-Team-Id'] = teamId;
  }

  const response = await fetch(`${_config.API_BASE_URL}/api/analysis/execute`, {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};

export const updateAnalysisStatus = async (
  analysisId: string,
  status: string,
  token: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const response = await fetch(`${_config.API_BASE_URL}/api/analysis/${analysisId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP error! status: ${response.status}`
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update analysis status"
    };
  }
};

export const streamAnalysisLogs = async (
  analysisId: string,
  token: string,
  teamId?: string
): Promise<Response> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  // Add team ID header if available
  if (teamId) {
    headers['X-Team-Id'] = teamId;
  }

  console.log(analysisId, "here is the anlaysis id ..")
  const response = await fetch(`${_config.API_BASE_URL}/api/analysis/${analysisId}/stream`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};