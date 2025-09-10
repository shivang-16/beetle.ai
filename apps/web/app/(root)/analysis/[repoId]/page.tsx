import React, { Suspense } from "react";
import RepoWrapper from "./_components/RepoWrapper";
import RepoSkeleton from "./_components/RepoSkeleton";

const Page = async ({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ repoId: string }>;
  searchParams?: Promise<{ teamId?: string }>;
}) => {
  const { repoId } = await params;
  const searchParamsData = await searchParams;
  const teamId = searchParamsData?.teamId;
  console.log(params,"params");

  return (
    <Suspense key={repoId} fallback={<RepoSkeleton />}>
      <RepoWrapper repoId={repoId} teamId={teamId} />
    </Suspense>
  );
};

export default Page;
