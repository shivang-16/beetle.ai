"use client";

import React, { useEffect, useState } from "react";
import { _config } from "@/lib/_config";
import { Button } from "@/components/ui/button";
import RenderLogs from "./RenderLogs";

type AnalysisItem = {
  _id: string;
  analysisId: string;
  userId: string;
  repoUrl: string;
  model: string;
  prompt: string;
  status: "completed" | "interrupted" | "error";
  exitCode?: number | null;
  createdAt: string;
  updatedAt: string;
};

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

const AnalysisViewer = ({ repoId }: { repoId: string }) => {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${_config.API_BASE_URL}/api/analysis/${encodeURIComponent(repoId)}`,
          { credentials: "include" }
        );
        const json = await res.json();
        const list: AnalysisItem[] = Array.isArray(json?.data) ? json.data : [];
        setAnalyses(list);
        const first = list.length > 0 ? list[0] : undefined;
        setSelectedId(first ? first._id : null);
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyses();
  }, [repoId]);

  return (
    <div className="h-full w-full flex">
      <aside className="w-96 border-r h-full overflow-y-auto output-scrollbar p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">Analyses</h3>
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={async () => {
              try {
                setLoading(true);
                const res = await fetch(
                  `${_config.API_BASE_URL}/api/analysis/${encodeURIComponent(repoId)}`,
                  { credentials: "include" }
                );
                const json = await res.json();
                const list: AnalysisItem[] = Array.isArray(json?.data)
                  ? json.data
                  : [];
                setAnalyses(list);
                if (!selectedId) {
                  const first = list.length > 0 ? list[0] : undefined;
                  if (first) setSelectedId(first._id);
                }
              } catch {
                // noop
              } finally {
                setLoading(false);
              }
            }}>
            Refresh
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {analyses?.map((a, idx) => (
            <Button
              key={a._id}
              variant={"outline"}
              className={`flex-col h-auto items-start text-left border rounded p-3 transition cursor-pointer ${
                selectedId === a._id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedId(a._id)}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs text-muted-foreground">
                  #{idx + 1}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border ${statusColor(
                    a.status
                  )}`}>
                  {a.status}
                </span>
              </div>
              <div className="mt-1 text-sm font-medium truncate">
                {a.repoUrl}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </Button>
          ))}
          {!loading && analyses.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No analyses yet.
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1">
        <RenderLogs repoId={repoId} analysisId={selectedId || undefined} />
      </main>
    </div>
  );
};

export default AnalysisViewer;
