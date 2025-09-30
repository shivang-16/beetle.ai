"use client";

import React from "react";
import { _config } from "@/lib/_config";
import RenderLogs from "./RenderLogs";
import GithubIssuesSlider from "./GithubIssuesSlider";
import { RepoTree } from "@/types/types";
import { useParams } from "next/navigation";

const AnalysisViewer = ({
  repoId,
  repoTree,
  branch,
  teamId
}: {
  repoId: string;
  repoTree: RepoTree;
  branch?: string;
  teamId?: string;
}) => {
  const { analysisId } = useParams<{ repoId: string; analysisId?: string }>();

  return (
    <div className="h-screen w-full flex relative overflow-hidden">
      <div className="flex-1 h-full overflow-hidden">
        <RenderLogs
          repoId={repoId}
          analysisId={analysisId || undefined}
          repoTree={repoTree}
          branch={branch}
          teamId={teamId}
        />
      </div>
      
      {/* GitHub Issues Slider positioned in top-right */}
      <div className="absolute top-4 right-4 z-10">
        <GithubIssuesSlider 
          repoId={repoId} 
          analysisId={analysisId || undefined} 
        />
      </div>
    </div>
  );
};

export default AnalysisViewer;
