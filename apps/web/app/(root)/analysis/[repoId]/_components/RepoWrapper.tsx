import React from "react";
import RepoFileTree from "./RepoFileTree";
import { getRepoTree } from "../_actions/getRepoTree";
import AnalysisViewer from "./AnalysisViewer";


const RepoWrapper = async ({ repoId, teamId }: { repoId: string; teamId?: string }) => {
  const repoTree = await getRepoTree(decodeURIComponent(repoId), teamId);

  return (
    <div className="h-svh flex">
      <RepoFileTree repoTree={repoTree.data} />
      <div className="flex-1">
        <AnalysisViewer repoId={decodeURIComponent(repoId)} />
      </div>
    </div>
  );
};

export default RepoWrapper;
