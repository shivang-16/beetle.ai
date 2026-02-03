"use server";

import { apiGet } from "@/lib/api-client";

export const getUser = async () => {
  const response = await apiGet("/api/user", { includeTeamId: false });
  const userData = await response.json();
  return await userData.user;
};

export const getMyTeams = async () => {
  const response = await apiGet("/api/team/mine", { includeTeamId: false });
  const teamsData = await response.json();
  return await teamsData.data;
};

/**
 * Get team integrations (GitHub and Bitbucket)
 * This replaces the old getTeamInstallations with a more comprehensive endpoint
 */
export const getTeamInstallations = async () => {
  const response = await apiGet("/api/integrations");
  const integrationsData = await response.json();
  
  if (!integrationsData.success) {
    return [];
  }
  
  // Transform the new format to match the old format for backward compatibility
  const allAccounts: any[] = [];
  
  integrationsData.data.forEach((integration: any) => {
    if (integration.installations && integration.installations.length > 0) {
      integration.installations.forEach((inst: any) => {
        allAccounts.push({
          id: inst.installationId || inst.workspaceSlug,
          login: inst.login,
          type: inst.type || (integration.id === 'github' ? 'Organization' : 'workspace'),
          avatarUrl: inst.avatarUrl || null,
          source: integration.id,
          displayName: inst.displayName
        });
      });
    }
  });
  
  return allAccounts;
};

