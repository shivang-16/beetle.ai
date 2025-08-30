import React, { Suspense } from "react";
import SearchRepositories from "./_components/SearchRepositories";
import RepositoryList from "./_components/RepositoryList";
import RepositoryListSkeleton from "./_components/RepositoryListSkeleton";

const Page = async (props: { searchParams?: Promise<{ query?: string }> }) => {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";

  return (
    <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
      <div className="h-full border rounded-3xl p-4">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-2xl font-medium flex-1">Repositories</h2>

          <div className="flex-1 flex justify-end">
            <SearchRepositories />
          </div>
        </div>

        <div className="h-[calc(100%-3rem)] overflow-y-auto scrollBar">
          <Suspense key={query} fallback={<RepositoryListSkeleton />}>
            <RepositoryList query={query} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Page;
