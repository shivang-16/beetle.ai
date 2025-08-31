"use server";

import { revalidateTag } from "next/cache";

export const syncRepositories = async () => {
  revalidateTag("repository_list");
};
