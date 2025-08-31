import React from "react";
import { getRepository } from "../_actions/getRepository";

export async function generateStaticParams() {
  const repos = await getRepository("");

  return Object?.values(repos.data)[0]?.map((repo) => ({
    repoId: repo._id,
  }));
}

const Page = async ({ params }: { params: Promise<{ repoId: string }> }) => {
  const { repoId } = await params;
  console.log({ repoId });

  return <div className="h-full">Page</div>;
};

export default Page;
