import React from "react";
import RepoFileTree from "./RepoFileTree";
import { getRepoTree } from "../_actions/getRepoTree";
import { analyzeRepo } from "../_actions/analyzeRepo";

const RepoWrapper = async ({ repoId }: { repoId: string }) => {
  const repoTree = await getRepoTree(decodeURIComponent(repoId));
  const analysisLogs = await analyzeRepo(decodeURIComponent(repoId));
  console.log(`===== Analysis Logs =====`, analysisLogs);

  return (
    <div className="h-svh flex">
      <RepoFileTree repoTree={repoTree.data} />
      <div className="flex-1">Page</div>
    </div>
  );
};

export default RepoWrapper;
