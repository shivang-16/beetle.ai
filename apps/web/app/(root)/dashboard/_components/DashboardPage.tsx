"use client";

import React, { useState } from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import NoInstallationOnboarding from "@/app/(root)/dashboard/_components/NoInstallationOnboarding";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDashboardData } from "../_actions/getDashboardData";
import { getUserInstallations } from "@/_actions/user-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FullRepoReviewChart } from "./FullRepoReviewChart";

const DashboardPage = () => {
  const [days, setDays] = useState<number>(7);

  const { data: dashboardData } = useSuspenseQuery({
    queryKey: ["dashboardData", days],
    queryFn: () => getDashboardData(days),
  });

  const { data: installations } = useSuspenseQuery({
    queryKey: ["userInstallations"],
    queryFn: async () => {
      try {
        const data = await getUserInstallations();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    },
  });

  // Defer conditional rendering to the main content area so the header remains.

  return (
    <div className="h-full space-y-6 p-5">
      {/* Top-right range selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Hello 👋 </h1>

        <div className="flex items-center">
          <Select
            defaultValue={days.toString()}
            onValueChange={(value) => setDays(Number(value))}
          >
            <SelectTrigger className="gap-2 px-2 text-xs">
              <SelectValue placeholder="Select days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="15">Last 15 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!installations || installations.length === 0 ? (
        <NoInstallationOnboarding />
      ) : !dashboardData.data ? (
        <div className="flex h-full items-center justify-center px-4 py-5">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      ) : (
        <>
          {/* Dashboard Metrics */}
          <DashboardMetrics data={dashboardData.data} />

          {/* 2x2 Grid Layout: 4 Charts in 2 columns, 2 rows */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Row 1, Column 1 - Recent Activity */}
            <RecentActivity data={dashboardData.data} />

            {/* Row 1, Column 2 - Full Repo Review */}
            <FullRepoReviewChart data={dashboardData.data} />

            {/* Row 2, Column 1 - Pull Requests Chart */}
            <PullRequestsChart data={dashboardData.data} />

            {/* Row 2, Column 2 - GitHub Issues Chart */}
            <GitHubIssuesChart data={dashboardData.data} />
          </div>

          {/* Activity Overview Chart - Full width below */}
          {/* <div className="mb-6">
              <ActivityOverviewChart data={dashboardData} />
            </div> */}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
