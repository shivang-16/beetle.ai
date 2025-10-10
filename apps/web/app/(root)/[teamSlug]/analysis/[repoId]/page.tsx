import React from "react";
import { getRepoTree } from "../../../analysis/[repoId]/_actions/getRepoTree";
import AnalysisViewer from "../../../analysis/[repoId]/_components/AnalysisViewer";

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

  // Fetch repo tree at page level to prevent refetching when logs change
  const repoTree = await getRepoTree(decodeURIComponent(repoId), teamId);

  return (
    <div className="h-svh flex">
      <div className="flex-1">
        <AnalysisViewer 
          repoId={decodeURIComponent(repoId)} 
          repoTree={repoTree.data} 
          teamId={teamId} 
        />
      </div>
    </div>
  );
};

export default Page;