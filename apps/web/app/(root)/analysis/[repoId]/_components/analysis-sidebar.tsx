import React from "react";
import AnalysisContent from "./AnalysisContent";
import { AnalysisItem } from "@/types/types";

const AnalysisSidebar = ({
  repoId,
  analysisList,
  isSheet,
}: {
  repoId: string;
  analysisList: AnalysisItem[];
  isSheet?: boolean;
}) => {
  return (
    <>
      {analysisList && analysisList.length > 0 && (
        <AnalysisContent
          analysisList={analysisList}
          repoId={repoId}
          isSheet={isSheet}
        />
      )}
    </>
  );
};

export default AnalysisSidebar;
