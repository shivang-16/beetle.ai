import React from "react";
import { getRepoTree } from "../../../../analysis/[repoId]/_actions/getRepoTree";
import AnalysisViewer from "../../../../analysis/[repoId]/_components/AnalysisViewer";
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

  // Fetch repo tree at page level to prevent refetching when logs change
  const repoTree = await getRepoTree(decodeURIComponent(repoId), teamId, branch);

  return (
    <div className="h-svh flex">
      <div className="flex-1">
        <AnalysisViewer 
          repoId={decodeURIComponent(repoId)} 
          repoTree={repoTree.data} 
          branch={branch} 
          teamId={teamId} 
        />
      </div>
    </div>
  );
};

export default Page;