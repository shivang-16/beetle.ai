import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getDashboardData } from "./_actions/getDashboardData";
import DashboardPage from "./_components/DashboardPage";
import { Loader2Icon } from "lucide-react";
import { getTeamInstallations } from "@/_actions/user-actions";
import { GitHubInstallationHandler } from "./_components/GitHubInstallationHandler";

export const dynamic = "force-dynamic";

const Page = async () => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["dashboardData", 7],
    queryFn: () => getDashboardData(7),
  });

  await queryClient.prefetchQuery({
    queryKey: ["userInstallations"],
    queryFn: async () => {
      try {
        const data = await getTeamInstallations();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* GitHub installation callback handler */}
      <GitHubInstallationHandler />
      
      <div className="h-full w-full mx-auto">
        <ErrorBoundary
          fallback={
            <div className="h-full  flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error loading dashboard</p>
                {/* <p className="text-gray-600">{error.message}</p> */}
              </div>
            </div>
          }>
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <Loader2Icon className="h-6 w-6 animate-spin" />
                  <span>Loading dashboard...</span>
                </div>
              </div>
            }>
            <DashboardPage />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrationBoundary>
  );
};

export default Page;
