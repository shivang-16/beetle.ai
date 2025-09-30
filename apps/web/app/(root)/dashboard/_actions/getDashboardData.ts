"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { DashboardResponse } from "@/types/dashboard";
import { logger } from "@/lib/logger";

export const getDashboardData = async () => {
  try {
    const { token } = await getAuthToken();

    const response = await fetch(
      `${_config.API_BASE_URL}/api/user/dashboard`,
      {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: "no-store", // Dashboard data should be fresh
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
    }

    const data: DashboardResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API returned unsuccessful response');
    }

    return data;
  } catch (error) {
    logger.error("Failed to fetch dashboard data", { 
      error: error instanceof Error ? error.message : error 
    });

    if (error instanceof Error) {
      logger.error("Dashboard fetch error details", { 
        message: error.message,
        stack: error.stack 
      });

      throw new Error(`${error.message}`);
    } else {
      throw new Error(
        "An unexpected error occurred while fetching the dashboard data"
      );
    }
  }
};