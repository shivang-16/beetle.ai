"use client";

import React, { useEffect } from "react";
import { TreeProvider, TreeView } from "@/components/ui/kibo-ui/tree";
import { useSidebar } from "@/components/ui/sidebar";
import { RepoTree } from "@/types/types";
import { buildTreeStructure } from "@/lib/utils";
import RenderTreeNode from "./RenderTreeNode";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

const RepoFileTree = ({ repoTree }: { repoTree: RepoTree }) => {
  const treeData = buildTreeStructure(repoTree?.tree || []) ?? [];

  const { setOpen } = useSidebar();

  useEffect(() => {
    // on mount
    setOpen(false);

    //Cleanup function runs on unmount
    return () => {
      setOpen(true);
    };
  }, []);

  return (
    <TreeProvider
      onSelectionChange={(ids) => logger.debug("Tree selection changed", { selectedIds: ids })}
      className="max-w-56 overflow-y-auto output-scrollbar border-r ">
      <TreeView className="!p-0">
        {repoTree && repoTree.repository && repoTree.repository.repo && (
          <Button
            variant={"secondary"}
            className="bg-transparent cursor-pointer rounded-none w-full">
            <span className="w-full truncate text-left">
              {repoTree?.repository?.repo}
            </span>
          </Button>
        )}
        {treeData && treeData.length > 0 ? (
          treeData.map((node, i) => (
            <RenderTreeNode key={`${node.id}-${i}`} node={node} />
          ))
        ) : (
          <div>No Tree Found</div>
        )}
      </TreeView>
    </TreeProvider>
  );
};

export default RepoFileTree;
