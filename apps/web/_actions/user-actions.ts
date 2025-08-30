import { getAuthToken } from "./auth-token";

export const getUser = async () => {
  const { token } = await getAuthToken();
  const user = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const userData = await user.json();
  return await userData.user;
};