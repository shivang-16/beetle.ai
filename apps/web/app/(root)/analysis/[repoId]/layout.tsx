import React, { Suspense } from "react";
import AnalysisSidebar from "./_components/analysis-sidebar";

export default async function AnalysisLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;

  return (
    <div className="flex h-screen">
      <Suspense key={repoId}>
        <AnalysisSidebar repoId={repoId} />
        <div className="flex-1">{children}</div>
      </Suspense>
    </div>
  );
}
