import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardData } from "@/types/dashboard";
import { GitBranch, GitPullRequest, Bug, MessageSquare } from "lucide-react";

interface DashboardMetricsProps {
  data: DashboardData;
}

export const DashboardMetrics = ({ data }: DashboardMetricsProps) => {
  const metrics = [
    {
      title: "Total Repositories Added",
      value: data.total_repo_added,
      icon: <GitBranch className="h-5 w-5" />
    },
    {
      title: "Full Repo Reviews",
      value: data.full_repo_review.total_reviews,
      icon: <GitPullRequest className="h-5 w-5" />
    },
    {
      title: "GitHub Issues Suggested",
      value: data.full_repo_review.total_github_issues_suggested,
      icon: <Bug className="h-5 w-5" />
    },
    {
      title: "GitHub Issues Opened",
      value: data.full_repo_review.github_issues_opened,
      icon: <Bug className="h-5 w-5" />
    },
    {
      title: "Pull Requests Suggested",
      value: data.full_repo_review.total_pull_request_suggested,
      icon: <GitPullRequest className="h-5 w-5" />
    },
    {
      title: "Pull Requests Opened",
      value: data.full_repo_review.pull_request_opened,
      icon: <GitPullRequest className="h-5 w-5" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{metric.title}</h3>
            <div className="text-muted-foreground">{metric.icon}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metric.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};