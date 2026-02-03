"use server";

import { apiGet, apiPost } from "@/lib/api-client";
import { logger } from "@/lib/logger";

export const getIntegrationsAction = async () => {
  try {
    const response = await apiGet("/api/integrations");
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to fetch integrations");
    }
    return await response.json();
  } catch (error) {
    logger.error("Error in getIntegrationsAction", { error });
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const disconnectIntegrationAction = async (id: string) => {
  try {
    const response = await apiPost(`/api/integrations/disconnect/${id}`);
    if (!response.ok) {
      const error = await response.text();
      // throw new Error(error || "Failed to disconnect integration");
    }
    return await response.json();
  } catch (error) {
    logger.error("Error in disconnectIntegrationAction", { error, id });
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const disconnectInstallationAction = async (type: string, id: string | number) => {
  try {
    const response = await apiPost(`/api/integrations/disconnect-item`, { type, id });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to disconnect installation");
    }
    return await response.json();
  } catch (error) {
    logger.error("Error in disconnectInstallationAction", { error, type, id });
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const reconnectIntegrationAction = async (type: string) => {
  try {
    const response = await apiPost(`/api/integrations/reconnect`, { type });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to reconnect");
    }
    return await response.json();
  } catch (error) {
    logger.error("Error in reconnectIntegrationAction", { error, type });
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
};
export const linkGitHubInstallationAction = async (installationId: string) => {
  try {
    const response = await apiPost("/api/github/installation/link", {
      installation_id: installationId
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to link GitHub installation");
    }
    
    return await response.json();
  } catch (error) {
    logger.error("Error in linkGitHubInstallationAction", { error, installationId });
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const reconnectInstallationAction = async (type: string, id: string | number) => {
  try {
    const response = await apiPost(`/api/integrations/reconnect-item`, { type, id });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to reconnect installation");
    }
    return await response.json();
  } catch (error) {
    logger.error("Error in reconnectInstallationAction", { error, type, id });
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
};
