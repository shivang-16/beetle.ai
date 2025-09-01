"use server";

import { _config } from "@/lib/_config";
import { getAuthToken } from "./auth-token";

export const getUser = async () => {
  const { token } = await getAuthToken();
  const user = await fetch(`${_config.API_BASE_URL}/api/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const userData = await user.json();
  return await userData.user;
};
