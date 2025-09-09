import React from "react";
import RepoFileTree from "./RepoFileTree";
import { getRepoTree } from "../_actions/getRepoTree";
import RenderLogs from "./RenderLogs";

const RepoWrapper = async ({ repoId }: { repoId: string }) => {
  const repoTree = await getRepoTree(decodeURIComponent(repoId));

  return (
    <div className="h-svh flex">
      <RepoFileTree repoTree={repoTree.data} />
      <div className="flex-1">
        <RenderLogs repoId={decodeURIComponent(repoId)} />
      </div>
    </div>
  );
};

export default RepoWrapper;
