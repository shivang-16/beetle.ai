import React, { Suspense } from "react";
import RepoWrapper from "./_components/RepoWrapper";
import RepoSkeleton from "./_components/RepoSkeleton";

const Page = async ({ params }: { params: Promise<{ repoId: string }> }) => {
  const { repoId } = await params;

  return (
    <Suspense key={repoId} fallback={<RepoSkeleton />}>
      <RepoWrapper repoId={repoId} />
    </Suspense>
  );
};

export default Page;
