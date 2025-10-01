import React, { Suspense } from "react";
import SearchRepositories from "../../analysis/_components/SearchRepositories";
import RepositoryList from "../../analysis/_components/RepositoryList";
import RepositoryListSkeleton from "../../analysis/_components/RepositoryListSkeleton";
import SyncRepositoriesButton from "../../analysis/_components/SyncRepositoriesButton";
import TeamSwitcher from "../../analysis/_components/TeamSwitcher";
import { AddRepositoriesModal } from "./_components/add-repositories-modal";
import { logger } from "@/lib/logger";

type RepoScope = "user" | "team";

interface PageProps {
  params: Promise<{
    teamSlug: string;
  }>;
  searchParams?: Promise<{
    query?: string;
    scope?: RepoScope;
    teamId?: string;
  }>;
}

const Page = async (props: PageProps) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";
  const scope = (searchParams?.scope as RepoScope) || "team"; // Default to team scope for team routes
  const teamId = searchParams?.teamId;
  const teamSlug = params.teamSlug;
  
  logger.info(`Team analysis page loaded with query:`, { query, scope, teamId, teamSlug });

  return (
    <div className="h-svh max-w-8xl w-full mx-auto py-5 px-4">
      <div className="h-full p-4">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <div>
            <h2 className="text-2xl font-medium">Team Repositories</h2>
            <p className="text-sm text-gray-500">Team: {teamSlug}</p>
          </div>

          <div className="flex-1 flex justify-end gap-3">
            <TeamSwitcher />
            <SearchRepositories />

            <SyncRepositoriesButton />

            <AddRepositoriesModal teamSlug={teamSlug} />
          </div>
        </div>

        <Suspense fallback={<RepositoryListSkeleton />}>
          <RepositoryList query={query} scope={scope} teamId={teamId} />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;