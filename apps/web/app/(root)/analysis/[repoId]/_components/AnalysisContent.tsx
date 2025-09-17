"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalysisItem } from "@/types/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
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

  const analysis_id = pathname.split("/")[pathname.split("/").length - 1];

  const router = useRouter();

  const searchParams = useSearchParams();
  const branch = searchParams.get("branch");
  const teamId = searchParams.get("teamId");
  console.log({ teamId, branch });

  useEffect(() => {
    if (analysisList && analysisList.length > 0) {
      router.replace(
        `/analysis/${repoId}/${analysisList[0]?._id}?teamId=${teamId}&branch=${branch}`
      );
    }
  }, []);

  return (
    <aside className="w-96 border-r h-full">
      <div className="flex items-center justify-between p-3">
        <h3 className="text-base font-medium">Analyses</h3>
        <Button
          size="sm"
          onClick={async () => await refreshAnalysisList(repoId)}
          className="cursor-pointer">
          Refresh
        </Button>
      </div>
      <div className="flex flex-col gap-2 h-[calc(100%-36px-24px)] overflow-y-auto output-scrollbar p-3">
        {analysisList?.map((a, idx) => (
          <Button
            key={a._id}
            variant={"outline"}
            className={cn(
              `flex-col h-auto items-start text-left border rounded p-3 transition cursor-pointer`,
              analysis_id === a._id ? "border-primary" : "border-input"
            )}
            asChild>
            <Link href={`/analysis/${repoId}/${a._id}`}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs text-muted-foreground">
                  #{idx + 1}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusColor(a.status)}`}>
                  {a.status}
                </span>
              </div>
              <div className="mt-1 text-sm font-medium truncate">
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
