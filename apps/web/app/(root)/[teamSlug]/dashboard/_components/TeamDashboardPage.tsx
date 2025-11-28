"use client";

import React, { useState } from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import { useParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getTeamDashboardData } from "../_actions/getTeamDashboardData";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { FullRepoReviewChart } from "@/app/(root)/dashboard/_components/FullRepoReviewChart";

const TeamDashboardPage = () => {
  const { teamSlug } = useParams<{ teamSlug: string }>();
  const [days, setDays] = useState<number>(7);

  const { data: dashboardData } = useSuspenseQuery({
    queryKey: ["teamDashboard", teamSlug, days],
    queryFn: () => getTeamDashboardData(days),
  });

  if (!dashboardData.data) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-5">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">No Data</h2>
          <p className="text-gray-600">
            No dashboard data available for team: {teamSlug}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-6 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-3xl">Team Dashboard</h1>

        <div className="flex items-center">
          <select
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={15}>Last 15 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <DashboardMetrics data={dashboardData.data} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Row 1, Column 1 - Recent Activity */}
                  <RecentActivity data={dashboardData.data} />
                  
                  {/* Row 1, Column 2 - Full Repo Review */}
                  <FullRepoReviewChart data={dashboardData.data} />
                  
                  {/* Row 2, Column 1 - Pull Requests Chart */}
                  <PullRequestsChart data={dashboardData.data} />
                  
                  {/* Row 2, Column 2 - GitHub Issues Chart */}
                  <GitHubIssuesChart data={dashboardData.data} />
                </div>
      
    </div>
  );
};

export default TeamDashboardPage;
