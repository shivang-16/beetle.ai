"use server";

import { auth } from "@clerk/nextjs/server";

export const getAuthToken = async () => {
  const { getToken } = await auth();
  const token = await getToken();
  return token;
};
