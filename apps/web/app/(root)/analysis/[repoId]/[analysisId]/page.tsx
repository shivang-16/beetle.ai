import React from "react";
import { getRepoTree } from "../_actions/getRepoTree";
import AnalysisViewer from "../_components/AnalysisViewer";

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
