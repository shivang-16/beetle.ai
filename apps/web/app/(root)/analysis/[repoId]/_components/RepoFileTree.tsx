"use client";

import React, { useEffect } from "react";
import {
  TreeExpander,
  TreeIcon,
  TreeLabel,
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "@/components/ui/kibo-ui/tree";
import { FileCode, FileJson, FileText, FileType } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const RepoFileTree = () => {
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
      defaultExpandedIds={["src", "components", "ui"]}
      onSelectionChange={(ids) => console.log("Selected:", ids)}
      className="w-auto border-r overflow-y-auto output-scrollbar">
      <TreeView>
        <TreeNode nodeId="src">
          <TreeNodeTrigger>
            <TreeExpander hasChildren />
            <TreeIcon hasChildren />
            <TreeLabel>src</TreeLabel>
          </TreeNodeTrigger>
          <TreeNodeContent hasChildren>
            <TreeNode level={1} nodeId="components">
              <TreeNodeTrigger>
                <TreeExpander hasChildren />
                <TreeIcon hasChildren />
                <TreeLabel>components</TreeLabel>
              </TreeNodeTrigger>
              <TreeNodeContent hasChildren>
                <TreeNode level={2} nodeId="ui">
                  <TreeNodeTrigger>
                    <TreeExpander hasChildren />
                    <TreeIcon hasChildren />
                    <TreeLabel>ui</TreeLabel>
                  </TreeNodeTrigger>
                  <TreeNodeContent hasChildren>
                    <TreeNode level={3} nodeId="button.tsx">
                      <TreeNodeTrigger>
                        <TreeExpander />
                        <TreeIcon icon={<FileCode className="h-4 w-4" />} />
                        <TreeLabel>button.tsx</TreeLabel>
                      </TreeNodeTrigger>
                    </TreeNode>
                    <TreeNode level={3} nodeId="card.tsx">
                      <TreeNodeTrigger>
                        <TreeExpander />
                        <TreeIcon icon={<FileCode className="h-4 w-4" />} />
                        <TreeLabel>card.tsx</TreeLabel>
                      </TreeNodeTrigger>
                    </TreeNode>
                    <TreeNode isLast level={3} nodeId="dialog.tsx">
                      <TreeNodeTrigger>
                        <TreeExpander />
                        <TreeIcon icon={<FileCode className="h-4 w-4" />} />
                        <TreeLabel>dialog.tsx</TreeLabel>
                      </TreeNodeTrigger>
                    </TreeNode>
                  </TreeNodeContent>
                </TreeNode>
                <TreeNode isLast level={2} nodeId="layout">
                  <TreeNodeTrigger>
                    <TreeExpander hasChildren />
                    <TreeIcon hasChildren />
                    <TreeLabel>layout</TreeLabel>
                  </TreeNodeTrigger>
                  <TreeNodeContent hasChildren>
                    <TreeNode level={3} nodeId="header.tsx">
                      <TreeNodeTrigger>
                        <TreeExpander />
                        <TreeIcon icon={<FileCode className="h-4 w-4" />} />
                        <TreeLabel>header.tsx</TreeLabel>
                      </TreeNodeTrigger>
                    </TreeNode>
                    <TreeNode isLast level={3} nodeId="footer.tsx">
                      <TreeNodeTrigger>
                        <TreeExpander />
                        <TreeIcon icon={<FileCode className="h-4 w-4" />} />
                        <TreeLabel>footer.tsx</TreeLabel>
                      </TreeNodeTrigger>
                    </TreeNode>
                  </TreeNodeContent>
                </TreeNode>
              </TreeNodeContent>
            </TreeNode>
          </TreeNodeContent>
        </TreeNode>
        <TreeNode nodeId="public">
          <TreeNodeTrigger>
            <TreeExpander hasChildren />
            <TreeIcon hasChildren />
            <TreeLabel>public</TreeLabel>
          </TreeNodeTrigger>
          <TreeNodeContent hasChildren>
            <TreeNode isLast level={1} nodeId="images">
              <TreeNodeTrigger>
                <TreeExpander hasChildren />
                <TreeIcon hasChildren />
                <TreeLabel>images</TreeLabel>
              </TreeNodeTrigger>
              <TreeNodeContent hasChildren>
                <TreeNode level={2} nodeId="logo.svg">
                  <TreeNodeTrigger>
                    <TreeExpander />
                    <TreeIcon icon={<FileText className="h-4 w-4" />} />
                    <TreeLabel>logo.svg</TreeLabel>
                  </TreeNodeTrigger>
                </TreeNode>
                <TreeNode isLast level={2} nodeId="hero.png">
                  <TreeNodeTrigger>
                    <TreeExpander />
                    <TreeIcon icon={<FileText className="h-4 w-4" />} />
                    <TreeLabel>hero.png</TreeLabel>
                  </TreeNodeTrigger>
                </TreeNode>
              </TreeNodeContent>
            </TreeNode>
          </TreeNodeContent>
        </TreeNode>
        <TreeNode nodeId="package.json">
          <TreeNodeTrigger>
            <TreeExpander />
            <TreeIcon icon={<FileJson className="h-4 w-4" />} />
            <TreeLabel>package.json</TreeLabel>
          </TreeNodeTrigger>
        </TreeNode>
        <TreeNode nodeId="tsconfig.json">
          <TreeNodeTrigger>
            <TreeExpander />
            <TreeIcon icon={<FileJson className="h-4 w-4" />} />
            <TreeLabel>tsconfig.json</TreeLabel>
          </TreeNodeTrigger>
        </TreeNode>
        <TreeNode isLast nodeId="README.md">
          <TreeNodeTrigger>
            <TreeExpander />
            <TreeIcon icon={<FileText className="h-4 w-4" />} />
            <TreeLabel>README.md</TreeLabel>
          </TreeNodeTrigger>
        </TreeNode>
      </TreeView>
    </TreeProvider>
  );
};

export default RepoFileTree;
