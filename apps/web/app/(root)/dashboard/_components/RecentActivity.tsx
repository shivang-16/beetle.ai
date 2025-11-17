import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardData } from "@/types/dashboard";

import { GitBranch, Clock, Bug, GitPullRequest, MessageSquare, Github } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { statusClasses } from "@/lib/utils/statusClasses";

interface RecentActivityProps {
  data: DashboardData;
}

export const RecentActivity = ({ data }: RecentActivityProps) => {
  // Explicitly type the merged activities as a discriminated union
  type RepoActivityUI = DashboardData["recent_activity"]["full_repo"][number] & {
    type: "repository";
  };
  type PRAcitivityUI = DashboardData["recent_activity"]["pull_request"][number] & {
    type: "pull_request";
    pr_title?: string;
    pr_number?: number;
  };

  const ActivityHeader = ({ activity }: { activity: RepoActivityUI | PRAcitivityUI }) => (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        {activity.type === 'pull_request' ? (
          <GitPullRequest className="h-3 w-3 text-primary" />
        ) : (
          <Github className="h-3 w-3" />
        )}
      </div>
      {activity.type === 'pull_request' ? (
        <>
          <h4 className="font-medium text-sm truncate">
            {(() => {
              const prNum = (activity as PRAcitivityUI).pr_number ?? getPrNumberFromUrl((activity as PRAcitivityUI).pr_url);
              const title = (activity as PRAcitivityUI).pr_title ?? 'Untitled Pull Request';
              return prNum ? `#${prNum} ${title}` : title;
            })()}
          </h4>
          <p className="text-xs mt-1">{activity.repo_name}</p>
        </>
      ) : (
        <>
          <h4 className="font-medium text-sm">{activity.repo_name}</h4>
          <p className="text-xs flex items-center gap-1 mt-1">
            <GitBranch className="h-3 w-3" />
            {activity.branch}
          </p>
        </>
      )}
    </div>
  );

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const getPrNumberFromUrl = (url?: string): number | undefined => {
    if (!url) return undefined;
    try {
      const match = url.match(/\/pulls?\/(\d+)/);
      return match ? Number(match[1]) : undefined;
    } catch {
      return undefined;
    }
  };

  // Merge and sort all activities by date (typed union)
  const mergedActivities: Array<RepoActivityUI | PRAcitivityUI> = [
    ...data.recent_activity.full_repo.map(repo => ({
      ...repo,
      type: 'repository' as const,
    })),
    ...data.recent_activity.pull_request.map((pr) => ({
      ...pr,
      type: 'pull_request' as const,
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 h-[450px] overflow-auto no-scrollbar">
          {mergedActivities.length > 0 ? (
            mergedActivities.map((activity, index) => (
              activity.type === 'pull_request' ? (
                <a
                  key={index}
                  href={activity?.pr_url || ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block cursor-pointer rounded-md border p-4 transition-colors hover:bg-neutral-100 hover:dark:bg-neutral-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <ActivityHeader activity={activity} />
                    <Badge className={statusClasses(activity.state)}>
                      {activity.state}
                    </Badge>
                  </div>

                  <div className="text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {activity.total_comments}
                    </div>
                  </div>

                  <p className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date)}
                  </p>
                </a>
              ) : activity.type === "repository" &&
                activity.repo_id &&
                activity.analysis_id ? (
                <Link
                  key={index}
                  href={`/analysis/${activity.repo_id}/${activity.analysis_id}`}
                  className="block cursor-pointer rounded-md border p-4 transition-colors hover:bg-neutral-100 hover:dark:bg-neutral-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <ActivityHeader activity={activity} />
                    <Badge className={statusClasses(activity.state)}>
                      {activity.state}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Issues: {activity.total_github_issues_suggested}{" "}
                      suggested, {activity.github_issues_opened} opened
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      PRs: {
                        activity.total_pull_request_suggested
                      } suggested, {activity.pull_request_opened} opened
                    </div>
                  </div>

                  <p className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date)}
                  </p>
                </Link>
              ) : (
                            <p className="text-center py-4">No recent activity</p>

              )
            ))
          ) : (
            <p className="text-center py-4">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
