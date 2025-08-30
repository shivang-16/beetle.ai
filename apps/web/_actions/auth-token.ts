"use server";

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
