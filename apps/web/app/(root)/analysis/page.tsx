import React, { Suspense } from "react";
import SearchRepositories from "./_components/SearchRepositories";
import RepositoryList from "./_components/RepositoryList";
import RepositoryListSkeleton from "./_components/RepositoryListSkeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SyncRepositoriesButton from "./_components/SyncRepositoriesButton";
import { Plus } from "lucide-react";
import GithubOrgSwitcher from "./_components/GithubOrgSwitcher";
import { logger } from "@/lib/logger";
import { SidebarTrigger } from "@/components/ui/sidebar";

type RepoScope = "user" | "team";

const Page = async (props: {
  searchParams?: Promise<{
    query?: string;
    scope?: RepoScope;
    teamId?: string;
    orgSlug?: string;
  }>;
}) => {
  const searchParams = await props.searchParams;
  const orgSlug = searchParams?.orgSlug || "all";
  const query = searchParams?.query || "";
  const scope = (searchParams?.scope as RepoScope) || "user";
  const teamId = searchParams?.teamId;
  logger.info(`Analysis page loaded with query:`, { query, scope, teamId });

  return (
    <div className="max-w-8xl mx-auto min-h-svh w-full">
      <div className="h-full p-4">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />

            <h2 className="text-2xl font-medium">Repositories</h2>
          </div>

          <div className="flex justify-end gap-3">
            <GithubOrgSwitcher />
            <SearchRepositories />

            <SyncRepositoriesButton />

            <Link
              href={
                "https://github.com/apps/beetle-ai/installations/select_target"
              }
              target="_blank"
            >
              <Button className="cursor-pointer text-xs">
                <Plus />
                <span className="hidden lg:block">Add Repositories</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="output-scrollbar h-[calc(100%-3rem)] overflow-y-auto px-3">
          <Suspense key={query} fallback={<RepositoryListSkeleton />}>
            <RepositoryList
              query={query}
              scope={scope}
              teamId={teamId}
              orgSlug={orgSlug}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Page;
