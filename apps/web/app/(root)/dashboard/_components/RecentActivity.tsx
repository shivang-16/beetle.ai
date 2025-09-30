import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardData } from "@/types/dashboard";
import { GitBranch, Clock, Bug, GitPullRequest, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityProps {
  data: DashboardData;
}

export const RecentActivity = ({ data }: RecentActivityProps) => {
  const getStatusColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  // Merge and sort all activities by date
  const mergedActivities = [
    ...data.recent_activity.full_repo.map(repo => ({
      ...repo,
      type: 'repository' as const,
      date: new Date(repo.date)
    })),
    ...data.recent_activity.pull_request.map(pr => ({
      ...pr,
      type: 'pull_request' as const,
      date: new Date(pr.date)
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 h-[400px] overflow-auto">
          {mergedActivities.length > 0 ? (
            mergedActivities.map((activity, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-neutral-900 cursor-pointer transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {activity.type === 'repository' ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-600">REPO</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-green-600">PR</span>
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{activity.repo_name}</h4>
                    {activity.type === 'repository' && 'branch' in activity && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <GitBranch className="h-3 w-3" />
                        {activity.branch}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(activity.state)}>
                    {activity.state}
                  </Badge>
                </div>
                
                {activity.type === 'repository' && 'total_github_issues_suggested' in activity ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Issues: {activity.total_github_issues_suggested} suggested, {activity.github_issues_opened} opened
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      PRs: {activity.total_pull_request_suggested} suggested, {activity.pull_request_opened} opened
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {'total_comments' in activity ? activity.total_comments : 0}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(activity.date.toISOString())}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};