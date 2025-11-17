import React, { Suspense } from "react";
import SearchRepositories from "../../analysis/_components/SearchRepositories";
import RepositoryList from "../../analysis/_components/RepositoryList";
import RepositoryListSkeleton from "../../analysis/_components/RepositoryListSkeleton";
import SyncRepositoriesButton from "../../analysis/_components/SyncRepositoriesButton";
import { AddRepositoriesModal } from "./_components/add-repositories-modal";
import { logger } from "@/lib/logger";
import { getMyTeams } from "@/_actions/user-actions";

type RepoScope = "user" | "team";

interface PageProps {
  params: Promise<{
    teamSlug: string;
  }>;
  searchParams?: Promise<{
    query?: string;
    scope?: RepoScope;
    teamId?: string;
    orgSlug?: string;
  }>;
}

const Page = async (props: PageProps) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const orgSlug = searchParams?.orgSlug || "all";
  const query = searchParams?.query || "";
  const scope = (searchParams?.scope as RepoScope) || "team"; // Default to team scope for team routes
  const teamId = searchParams?.teamId;
  const teamSlug = params.teamSlug;

  // Determine if the current user is an admin of this team
  const myTeams = await getMyTeams();
  const isTeamAdmin = Array.isArray(myTeams)
    ? myTeams.some((t: any) => t?.slug === teamSlug && t?.role === "admin")
    : false;

  logger.info(`Team analysis page loaded with query:`, {
    query,
    scope,
    teamId,
    teamSlug,
  });

  return (
    <div className="max-w-8xl mx-auto min-h-svh w-full">
      <div className="h-full w-full p-4">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-medium md:text-xl xl:text-2xl">
                Team Repositories
              </h2>
              <p className="text-sm text-gray-500">Team: {teamSlug}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {/* <GithubOrgSwitcher /> */}
            <SearchRepositories />

            <SyncRepositoriesButton />

            {isTeamAdmin ? (
              <AddRepositoriesModal teamSlug={teamSlug} />
            ) : null}
          </div>
        </div>

        <Suspense fallback={<RepositoryListSkeleton />}>
          <RepositoryList
            query={query}
            scope={scope}
            teamId={teamId}
            orgSlug={orgSlug}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default Page;
