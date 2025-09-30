"use client";

import React, { useEffect, useState } from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import { DashboardData } from "@/types/dashboard";
import { getDashboardData } from "../../dashboard/_actions/getDashboardData";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

const Page = ({ params }: PageProps) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamSlug, setTeamSlug] = useState<string>("");

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setTeamSlug(resolvedParams.teamSlug);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!teamSlug) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // TODO: Update getDashboardData to accept teamSlug/teamId parameter
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
  }, [teamSlug]);

  if (loading) {
    return (
      <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
        <div className="h-full flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading team dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
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
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No Data</h2>
            <p className="text-gray-600">No dashboard data available for team: {teamSlug}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-svh max-w-7xl w-full mx-auto py-5 px-4">
      <div className="h-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team Dashboard</h1>
          <div className="text-sm text-gray-500">Team: {teamSlug}</div>
        </div>
        
        <DashboardMetrics data={dashboardData} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity data={dashboardData} />
          <GitHubIssuesChart data={dashboardData} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PullRequestsChart data={dashboardData} />
          <ActivityOverviewChart data={dashboardData} />
        </div>
      </div>
    </div>
  );
};

export default Page;