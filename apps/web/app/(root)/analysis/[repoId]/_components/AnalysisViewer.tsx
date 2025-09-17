"use client";

import React from "react";
import { _config } from "@/lib/_config";
import RenderLogs from "./RenderLogs";
import { RepoTree } from "@/types/types";
import { useParams } from "next/navigation";

const AnalysisViewer = ({
  repoId,
  repoTree,
}: {
  repoId: string;
  repoTree: RepoTree;
}) => {
  const { analysisId } = useParams<{ repoId: string; analysisId?: string }>();

  return (
    <div className="h-full w-full flex">
      <RenderLogs
        repoId={repoId}
        analysisId={analysisId || undefined}
        repoTree={repoTree}
      />
    </div>
  );
};

export default AnalysisViewer;
