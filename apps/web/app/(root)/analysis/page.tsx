import React, { Suspense } from "react";
import SearchRepositories from "./_components/SearchRepositories";
import RepositoryList from "./_components/RepositoryList";
import RepositoryListSkeleton from "./_components/RepositoryListSkeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SyncRepositoriesButton from "./_components/SyncRepositoriesButton";
import { Plus } from "lucide-react";
import GithubOrgSwitcher from "./_components/GithubOrgSwitcher";
import IntegrationFilter from "./_components/IntegrationFilter";
import { logger } from "@/lib/logger";
import { SidebarTrigger } from "@/components/ui/sidebar";

const Page = async (props: {
  searchParams?: Promise<{
    query?: string;
    teamId?: string;
    orgSlug?: string;
    integration?: string;
  }>;
}) => {
  const searchParams = await props.searchParams;
  const orgSlug = searchParams?.orgSlug || "all";
  const query = searchParams?.query || "";
  const teamId = searchParams?.teamId;
  const integration = searchParams?.integration || "all";
  logger.info(`Analysis page loaded with query:`, { query, teamId, integration });

  return (
    <div className="max-w-8xl mx-auto min-h-svh w-full">
      <div className="h-full p-4">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />

            <h2 className="text-2xl font-medium">Repositories</h2>
          </div>

          <div className="flex justify-end gap-3">
            <IntegrationFilter />
            {/* <GithubOrgSwitcher /> */}
            <SearchRepositories />

            <SyncRepositoriesButton />

            <Link
              href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "beetle-ai"}/installations/select_target`}
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
          <Suspense key={`${query}-${integration}`} fallback={<RepositoryListSkeleton />}>
            <RepositoryList
              query={query}
              teamId={teamId}
              orgSlug={orgSlug}
              integration={integration}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Page;


