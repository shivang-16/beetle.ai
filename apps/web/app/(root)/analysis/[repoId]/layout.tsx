import React, { Suspense } from "react";
import AnalysisSidebar from "./_components/analysis-sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { getAnalysisWithId } from "./_actions/getAnalysiswithId";

export default async function AnalysisLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;
  const analysisList = await getAnalysisWithId(repoId);

  return (
    <div className="h-screen">
      <Suspense>
        <ResizablePanelGroup direction="horizontal" className="h-full">
            {analysisList && analysisList.length > 0 && (
              <>
                <ResizablePanel defaultSize={20} minSize={4} maxSize={25}>
                  <AnalysisSidebar repoId={repoId} analysisList={analysisList} />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>)}
          <ResizablePanel defaultSize={75}>
            <div className="h-full">{children}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Suspense>
    </div>
  );
}
