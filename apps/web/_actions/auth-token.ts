import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const getAuthToken = async () => {
  const { getToken, userId, isAuthenticated } = await auth();

  if (!userId || !isAuthenticated) {
    redirect("/sign-in");
  }

  const token = await getToken();

  return { token, userId, isAuthenticated };
};

export const getAuthWithTeam = async () => {
  const { getToken, userId, isAuthenticated, sessionClaims } = await auth();

  if (!userId || !isAuthenticated) {
    redirect("/sign-in");
  }

  const token = await getToken();
  const activeOrgId = (sessionClaims as any)?.o?.id as string | undefined;

  return { token, userId, isAuthenticated, teamId: activeOrgId };
};
