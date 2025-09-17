import React, { Suspense } from "react";
import RepoSkeleton from "../_components/RepoSkeleton";
import RepoWrapper from "../_components/RepoWrapper";

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ repoId: string }>;
  searchParams?: Promise<{ teamId?: string; branch?: string }>;
}) => {
  const { repoId } = await params;
  const searchParamsData = await searchParams;
  const teamId = searchParamsData?.teamId;
  const branch = searchParamsData?.branch;

  return (
    <Suspense key={repoId} fallback={<RepoSkeleton />}>
      <RepoWrapper repoId={repoId} teamId={teamId} branch={branch} />
    </Suspense>
  );
};

export default Page;
