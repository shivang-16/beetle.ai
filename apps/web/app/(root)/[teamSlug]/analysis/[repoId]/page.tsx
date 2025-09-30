import React, { Suspense } from "react";
import RepoWrapper from "../../../analysis/[repoId]/_components/RepoWrapper";
import RepoSkeleton from "../../../analysis/[repoId]/_components/RepoSkeleton";

interface PageProps {
  params: Promise<{
    teamSlug: string;
    repoId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  const { teamSlug, repoId } = resolvedParams;

  // TODO: Resolve teamSlug to teamId from database
  // For now, we'll pass teamSlug as teamId until we implement proper resolution
  const teamId = teamSlug; // This should be resolved to actual team ID

  return (
    <div className="h-svh w-full">
      <Suspense fallback={<RepoSkeleton />}>
        <RepoWrapper repoId={repoId} teamId={teamId} />
      </Suspense>
    </div>
  );
};

export default Page;