import React, { Suspense } from "react";
import AnalysisSidebar from "./_components/analysis-sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default async function AnalysisLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;

  return (
    <div className="h-screen">
      <Suspense>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={20} minSize={4} maxSize={36}>
            <AnalysisSidebar repoId={repoId} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            <div className="h-full">{children}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Suspense>
    </div>
  );
}
