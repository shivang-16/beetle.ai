import React, { Suspense } from "react";
import RepoSkeleton from "../../../../analysis/[repoId]/_components/RepoSkeleton";
import RepoWrapper from "../../../../analysis/[repoId]/_components/RepoWrapper";
import { auth } from "@clerk/nextjs/server";

interface PageProps {
  params: Promise<{ 
    teamSlug: string;
    repoId: string;
    analysisId: string;
  }>;
  searchParams?: Promise<{ branch?: string }>;
}

const Page = async ({
  params,
  searchParams,
}: PageProps) => {
  const resolvedParams = await params;
  const { repoId } = resolvedParams;
  const searchParamsData = await searchParams;
  const branch = searchParamsData?.branch;

    const { sessionClaims } = await auth();
    const activeOrgId = (sessionClaims as any)?.o?.id as string | undefined;

  // TODO: Resolve teamSlug to teamId from database
  // For now, we'll pass teamSlug as teamId until we implement proper resolution
  const teamId = activeOrgId; // This should be resolved to actual team ID

  return (
    <Suspense key={repoId} fallback={<RepoSkeleton />}>
      <RepoWrapper repoId={repoId} teamId={teamId} branch={branch} />
    </Suspense>
  );
};

export default Page;