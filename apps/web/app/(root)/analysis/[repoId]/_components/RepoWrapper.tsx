import React from "react";
import { getRepoTree } from "../_actions/getRepoTree";
import AnalysisViewer from "./AnalysisViewer";


const RepoWrapper = async ({ repoId, teamId, branch }: { repoId: string; teamId?: string; branch?: string }) => {
  const repoTree = await getRepoTree(decodeURIComponent(repoId), teamId, branch);

  return (
    <div className="h-svh flex">
      <div className="flex-1">
        <AnalysisViewer repoId={decodeURIComponent(repoId)} repoTree={repoTree.data} branch={branch} teamId={teamId} />
      </div>
    </div>
  );
};

export default RepoWrapper;
