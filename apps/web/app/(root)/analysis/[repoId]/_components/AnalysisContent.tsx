"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalysisItem } from "@/types/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { statusClasses } from "@/lib/utils/statusClasses";
import { useAnalysisList } from "@/hooks/useAnalysisList";

// Use shared status classes across the app

const AnalysisContent = ({
  analysisList: initialAnalysisList,
  repoId,
  isSheet,
}: {
  analysisList: AnalysisItem[];
  repoId: string;
  isSheet?: boolean;
}) => {
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  // Use the custom hook for analysis list management
  const {
    analysisList,
    isLoading: isRefreshing,
    error,
    refreshAnalysisList,
    hasRunningAnalyses,
  } = useAnalysisList({
    repoId,
    initialAnalysisList,
  });

  const analysis_id = pathname.split("/")[pathname.split("/").length - 1];

  const router = useRouter();

  const searchParams = useSearchParams();
  const branch = searchParams.get("branch");
  const teamId = searchParams.get("teamId");
  const scope = searchParams.get("scope");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (teamId) params.append("teamId", teamId);
    if (branch) params.append("branch", branch);
    if (scope) params.append("scope", scope);
    return params.toString();
  }, [teamId, branch, scope]);

  useEffect(() => {
    if (!analysisList?.length || isSheet) return;

    if (!isSheet) {
      const firstAnalysisId = analysisList[0]?._id;

      const redirectUrl = `/analysis/${repoId}/${firstAnalysisId}${queryString ? `?${queryString}` : ""}`;

      router.replace(redirectUrl);
    }
  }, [analysisList, queryString, repoId, router]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Set threshold at 200px - adjust this value as needed
        setIsNarrow(width < 200);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <aside ref={containerRef} className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-base font-medium">Analyses</h3>
        <Button
          size="sm"
          onClick={refreshAnalysisList}
          className="hidden cursor-pointer"
        >
          Refresh
        </Button>
      </div>
      <div className="output-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {analysisList?.map((analysis, idx) => (
          <Button
            key={analysis._id}
            variant={"outline"}
            className={cn(
              `h-auto cursor-pointer flex-col items-start rounded border p-3 text-left transition`,
              analysis_id === analysis._id ? "border-primary" : "border-input",
            )}
            asChild
          >
            <Link
              href={`/analysis/${repoId}/${analysis._id}${queryString ? `?${queryString}` : ""}`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  #{idx + 1}
                </span>
                <span
                  className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[8px] capitalize md:text-[10px] ${statusClasses(analysis.status)}`}
                >
                  {analysis.status === "running" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {analysis.status}
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 truncate text-[10px] font-medium whitespace-pre-wrap md:text-sm",
                )}
              >
                {new Date(analysis.createdAt).toLocaleString()}{" "}
              </div>
            </Link>
          </Button>
        ))}
      </div>
    </aside>
  );
};

export default AnalysisContent;
