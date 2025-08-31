"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { GithubRepository } from "@/types/types";

export const getRepository = async (query: string) => {
  try {
    const { token } = await getAuthToken();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/repositories?search=${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "force-cache",
        next: {
          tags: ["repository_list"],
        },
      }
    );

    const data: { success: boolean; data: Record<string, GithubRepository[]> } =
      await res.json();

    return data;
  } catch (error) {
    console.log(error);

    if (error instanceof Error) {
      console.log("instanceof Error: ", error);

      throw new Error(`${error.message}`);
    } else {
      throw new Error(
        "An unexpected error occurred while fetching the repositories"
      );
    }
  }
};
