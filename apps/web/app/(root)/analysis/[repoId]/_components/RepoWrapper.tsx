import React from "react";
import { getRepoTree } from "../_actions/getRepoTree";
import AnalysisViewer from "./AnalysisViewer";


const RepoWrapper = async ({ repoId, teamId }: { repoId: string; teamId?: string }) => {
  const repoTree = await getRepoTree(decodeURIComponent(repoId), teamId);

  return (
    <div className="h-svh flex">
      <div className="flex-1">
        <AnalysisViewer repoId={decodeURIComponent(repoId)} repoTree={repoTree.data} />
      </div>
    </div>
  );
};

export default RepoWrapper;
