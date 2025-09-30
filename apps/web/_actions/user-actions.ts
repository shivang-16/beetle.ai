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
