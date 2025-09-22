import React, { Suspense } from "react";
import SearchRepositories from "./_components/SearchRepositories";
import RepositoryList from "./_components/RepositoryList";
import RepositoryListSkeleton from "./_components/RepositoryListSkeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SyncRepositoriesButton from "./_components/SyncRepositoriesButton";
import { Plus } from "lucide-react";
import TeamSwitcher from "./_components/TeamSwitcher";
import { logger } from "@/lib/logger";

type RepoScope = "user" | "team";

const Page = async (props: {
  searchParams?: Promise<{
    query?: string;
    scope?: RepoScope;
    teamId?: string;
  }>;
}) => {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";
  const scope = (searchParams?.scope as RepoScope) || "user";
  const teamId = searchParams?.teamId;
  logger.info(`Analysis page loaded with query:`, { query, scope, teamId });

  return (
    <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
      <div className="h-full border rounded-3xl p-4">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-2xl font-medium">Repositories</h2>

          <div className="flex-1 flex justify-end gap-3">
            <TeamSwitcher />
            <SearchRepositories />

            <SyncRepositoriesButton />

            <Link
              href={
                "https://github.com/apps/codetector-ai/installations/select_target"
              }
              target="_blank">
              <Button className="cursor-pointer text-xs">
                <Plus />
                <span>Add Repositories</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="h-[calc(100%-3rem)] overflow-y-auto output-scrollbar">
          <Suspense key={query} fallback={<RepositoryListSkeleton />}>
            <RepositoryList query={query} scope={scope} teamId={teamId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Page;
