import React, { Suspense } from "react";
import AnalysisSidebar from "../../../analysis/[repoId]/_components/analysis-sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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