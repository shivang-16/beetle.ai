import React, { Suspense } from "react";
import AnalysisSidebar from "../../../analysis/[repoId]/_components/analysis-sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { getAnalysisWithId } from "@/app/(root)/analysis/[repoId]/_actions/getAnalysiswithId";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    teamSlug: string;
    repoId: string;
  }>;
}

export default async function TeamAnalysisLayout({
  children,
  params,
}: LayoutProps) {
  const resolvedParams = await params;
  const { teamSlug, repoId } = resolvedParams;
  // const analysisList = await getAnalysisWithId(repoId);

  return (
    <div className="h-full w-full">
      <Suspense>
        <ResizablePanelGroup direction="horizontal">
          {/* {analysisList && analysisList.length > 0 && (
            <>
              <ResizablePanel
                defaultSize={20}
                minSize={4}
                maxSize={25}
                className="hidden md:block"
              >
                <AnalysisSidebar repoId={repoId} analysisList={analysisList} />
              </ResizablePanel>
              <ResizableHandle withHandle className="hidden md:block" />
            </>
          )} */}
          <ResizablePanel defaultSize={75} className="flex-1">
            <div className="h-full w-full">{children}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Suspense>
    </div>
  );
}
