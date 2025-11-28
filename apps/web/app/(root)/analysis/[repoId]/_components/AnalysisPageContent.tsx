"use client";

import React, { useState } from "react";
import AnalysisViewer from "./AnalysisViewer";
import FileMap from "./FileMap";
import { RepoTree } from "@/types/types";
import ComingSoon from "@/components/coming-soon";

interface AnalysisPageContentProps {
  repoId: string;
  repoTree: RepoTree;
  branch?: string;
  teamId?: string;
}

const AnalysisPageContent: React.FC<AnalysisPageContentProps> = ({
  repoId,
  repoTree,
  branch,
  teamId,
}) => {
  const [activeTab, setActiveTab] = useState<"filemap" | "analysis">("filemap");

  const TabButton = ({ id, label }: { id: "filemap" | "analysis"; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`font-semibold py-3 px-6 transition-all duration-200 relative text-base ${
        activeTab === id
          ? 'text-foreground border-b-2 border-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col">
      {/* Tab Switcher */}
      <div className="flex border-b border-border bg-background px-4">
        <TabButton id="filemap" label="File Map" />
        <TabButton id="analysis" label="Analysis" />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "filemap" ? (
          <div className="h-full">
            {repoTree?.tree && repoTree.tree.length > 0 ? (
              <FileMap treeData={repoTree.tree} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No file data available</p>
              </div>
            )}
          </div>
        ) : (
        //   <AnalysisViewer
        //     repoId={repoId}
        //     repoTree={repoTree}
        //     branch={branch}
        //     teamId={teamId}
        //   />
        <ComingSoon/>
        )}
      </div>
    </div>
  );
};

export default AnalysisPageContent;
