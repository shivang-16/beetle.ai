"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalysisItem } from "@/types/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { refreshAnalysisList } from "../_actions/getAnalysiswithId";

const statusColor = (status: AnalysisItem["status"]) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "interrupted":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-red-100 text-red-700 border-red-200";
  }
};

const AnalysisContent = ({
  analysisList,
  repoId,
}: {
  analysisList: AnalysisItem[];
  repoId: string;
}) => {
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

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
    if (!analysisList?.length) return;

    const firstAnalysisId = analysisList[0]?._id;

    const redirectUrl = `/analysis/${repoId}/${firstAnalysisId}${queryString ? `?${queryString}` : ""}`;

    router.replace(redirectUrl);
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
    <aside ref={containerRef} className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-base font-medium">Analyses</h3>
        <Button
          size="sm"
          onClick={async () => await refreshAnalysisList(repoId)}
          className="cursor-pointer hidden">
          Refresh
        </Button>
      </div>
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto output-scrollbar p-3">
        {analysisList?.map((a, idx) => (
          <Button
            key={a._id}
            variant={"outline"}
            className={cn(
              `flex-col h-auto items-start text-left border rounded p-3 transition cursor-pointer`,
              analysis_id === a._id ? "border-primary" : "border-input"
            )}
            asChild>
            <Link
              href={`/analysis/${repoId}/${a._id}${queryString ? `?${queryString}` : ""}`}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs text-muted-foreground">
                  #{idx + 1}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusColor(a.status)} ${isNarrow ? "hidden" : "block"}`}>
                  {a.status}
                </span>
              </div>
              <div className={cn(
                "mt-1 text-sm font-medium truncate",
                isNarrow ? "hidden" : "block"
              )}>
                {new Date(a.createdAt).toLocaleString()}{" "}
              </div>
            </Link>
          </Button>
        ))}
      </div>
    </aside>
  );
};

export default AnalysisContent;
