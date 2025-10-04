"use server";

import { revalidateTag } from "next/cache";
import { apiPost } from "@/lib/api-client";
import { logger } from "@/lib/logger";

export interface SyncRepositoriesResult {
  success: boolean;
  message: string;
  details?: {
    updated: number;
    created: number;
    removed: number;
    totalRepositories: number;
    totalInstallations: number;
    errors: string[];
  };
}

export const syncRepositories = async (): Promise<SyncRepositoriesResult> => {
  try {
    logger.info("Starting repository synchronization");

    // Call the new sync endpoint that handles all installations
    const syncResponse = await apiPost("/api/github/sync");
    
    if (!syncResponse.ok) {
      throw new Error(`Sync request failed: ${syncResponse.status}`);
    }

    const syncData = await syncResponse.json();
    
    if (!syncData.success) {
      throw new Error(syncData.message || "Sync failed");
    }

    // Revalidate the repository list cache after syncing
    revalidateTag("repository_list");

    logger.info("Repository synchronization completed", syncData.data);

    return {
      success: true,
      message: syncData.message,
      details: syncData.data
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error("Repository synchronization failed", { error: errorMessage });
    
    return {
      success: false,
      message: `Sync failed: ${errorMessage}`,
      details: {
        updated: 0,
        created: 0,
        removed: 0,
        totalRepositories: 0,
        totalInstallations: 0,
        errors: [errorMessage]
      }
    };
  }
};
