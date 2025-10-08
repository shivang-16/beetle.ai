import React from "react";
import { getAnalysisWithId } from "../_actions/getAnalysiswithId";
import AnalysisContent from "./AnalysisContent";


const AnalysisSidebar = async ({ repoId }: { repoId: string }) => {
  const analysisList = await getAnalysisWithId(repoId);

  return (
    <>
      {analysisList && analysisList.length > 0 && (
       <AnalysisContent analysisList={analysisList} repoId={repoId} />
      )} 
    </>
  );
};

export default AnalysisSidebar;
