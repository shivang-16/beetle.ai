"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { logger } from "@/lib/logger";

export interface PrAnalysisItem {
  repoUrl: string;
  model: string;
  status: string;
  pr_number?: number;
  pr_url?: string;
  pr_title?: string;
  createdAt?: string;
  errorLogs?: string;
  github_repositoryId?: {
    _id: string;
    source?: 'github' | 'bitbucket';
  };
}

export interface GetPrAnalysesOptions {
  page?: number;
  limit?: number;
  query?: string;
}

export interface PrAnalysesResponse {
  success: boolean;
  data: PrAnalysisItem[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getPrAnalyses = async (opts: GetPrAnalysesOptions = {}) => {
  try {
    const { token } = await getAuthToken();
    const params = new URLSearchParams();
    if (opts.page && Number.isFinite(opts.page)) params.set("page", String(opts.page));
    if (opts.limit && Number.isFinite(opts.limit)) params.set("limit", String(opts.limit));
    if (opts.query && opts.query.trim().length > 0) params.set("search", opts.query.trim());

    const qs = params.toString();
    const url = `${_config.API_BASE_URL}/api/analysis/pull_requests${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch PR analyses");
    }

    const data: PrAnalysesResponse = await response.json();
    return data;
  } catch (error) {
    logger.error("Error fetching PR analyses", {
      error: error instanceof Error ? error.message : error,
    });

  }
};