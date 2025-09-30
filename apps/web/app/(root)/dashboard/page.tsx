"use client";

import React, { useEffect, useState } from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import { DashboardData } from "@/types/dashboard";
import { getDashboardData } from "./_actions/getDashboardData";
import { Loader2 } from "lucide-react";

const Page = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const result = await getDashboardData();
        setDashboardData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
        <div className="h-full flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
        <div className="h-full  flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading dashboard</p>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-svh max-w-8xl w-full mx-auto py-5 px-4">
      <div className="h-full overflow-y-auto scrollBar">
        
        {/* Dashboard Metrics */}
        <DashboardMetrics data={dashboardData} />
        
        {/* Bento Layout: Charts on left, Recent Activity on right */}
        <div className="flex gap-6 mb-6 ">
          {/* Left side - Recent Activity (takes 2 columns) */}
          <div className="w-full">
            <RecentActivity data={dashboardData} />

          </div>

          {/* Right side - Charts stacked (takes 1 column) */}
          <div className="w-full flex flex-col gap-4">

            <GitHubIssuesChart data={dashboardData} />
            <PullRequestsChart data={dashboardData} />
          </div>
        </div>
        
        {/* Activity Overview Chart - Full width below */}
        {/* <div className="mb-6">
          <ActivityOverviewChart data={dashboardData} />
        </div> */}
      </div>
    </div>
  );
};

export default Page;
