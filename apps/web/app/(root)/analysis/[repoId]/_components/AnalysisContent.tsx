"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalysisItem } from "@/types/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { refreshAnalysisList } from "../_actions/getAnalysiswithId";
import { Loader2 } from "lucide-react";
import { _config } from "@/lib/_config";
import { useAuth } from "@clerk/nextjs";

const statusColor = (status: AnalysisItem["status"]) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "interrupted":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "running":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-red-100 text-red-700 border-red-200";
  }
};

const AnalysisContent = ({
  analysisList: initialAnalysisList,
  repoId,
}: {
  analysisList: AnalysisItem[];
  repoId: string;
}) => {
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [analysisList, setAnalysisList] = useState<AnalysisItem[]>(initialAnalysisList);
  const { getToken } = useAuth();

  const analysis_id = pathname.split("/")[pathname.split("/").length - 1];

  // Check if there are any running analyses
  const hasRunningAnalyses = useMemo(() => {
    return analysisList.some(analysis => analysis.status === "running");
  }, [analysisList]);

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

  // Function to fetch analysis data directly
  const fetchAnalysisList = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${_config.API_BASE_URL}/api/analysis/${repoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const json = await res.json();
        const list: AnalysisItem[] = Array.isArray(json?.data) ? json.data : [];
        setAnalysisList(list);
      }
    } catch (error) {
      console.error("Failed to fetch analysis list:", error);
    }
  };

  // Auto-refresh when there are running analyses
  useEffect(() => {
    if (!hasRunningAnalyses) return;

    const interval = setInterval(fetchAnalysisList, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [hasRunningAnalyses, repoId, getToken]);

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
          onClick={fetchAnalysisList}
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
                  className={`text-[10px] px-2 py-0.5 rounded border capitalize flex items-center gap-1 ${statusColor(a.status)} ${isNarrow ? "hidden" : "block"}`}>
                  {a.status === "running" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
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
