"use client";

import React, { useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { IconMenu2 } from "@tabler/icons-react";
import AnalysisSidebar from "./analysis-sidebar";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAnalysisWithId } from "../_actions/getAnalysiswithId";

const AnalysisSheet = () => {
  const params = useParams<{ repoId: string }>();
  const { repoId } = params;

  const { data: analysisList } = useQuery({
    queryKey: ["analysisList", repoId],
    queryFn: () => getAnalysisWithId(repoId),
  });

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

  const router = useRouter();

  useEffect(() => {
    if (!analysisList?.length) return;

    const firstAnalysisId = analysisList[0]?._id;

    const redirectUrl = `/analysis/${repoId}/${firstAnalysisId}${queryString ? `?${queryString}` : ""}`;

    router.replace(redirectUrl);
  }, [analysisList, queryString, repoId, router]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant={"ghost"} size={"icon"}>
          <IconMenu2 />
          <span className="sr-only">Analysis list</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="max-w-sm">
        <SheetHeader className="sr-only">
          <SheetTitle>Analysis List</SheetTitle>
          <SheetDescription>
            View and manage previous analyses for this repository.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <AnalysisSidebar
            repoId={repoId}
            analysisList={analysisList || []}
            isSheet={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AnalysisSheet;
