import React from "react";
import AnalysisContent from "./AnalysisContent";
import { AnalysisItem } from "@/types/types";

const AnalysisSidebar = async ({ repoId, analysisList }: { repoId: string, analysisList: AnalysisItem[] }) => {

  return (
    <>
      {analysisList && analysisList.length > 0 && (
        <AnalysisContent analysisList={analysisList} repoId={repoId} />
      )}
    </>
  );
};

export default AnalysisSidebar;
