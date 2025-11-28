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

          {/* Bento Layout: Charts on left, Recent Activity on right */}
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left side - Recent Activity (takes 2 columns) */}
            <div className="w-full">
              <RecentActivity data={dashboardData.data} />
            </div>

            {/* Right side - Charts stacked (takes 1 column) */}
            <div className="flex w-full flex-col gap-4">
              <GitHubIssuesChart data={dashboardData.data} />
              <PullRequestsChart data={dashboardData.data} />
            </div>
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
