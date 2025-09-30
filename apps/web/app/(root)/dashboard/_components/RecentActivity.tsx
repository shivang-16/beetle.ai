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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Full Repository Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Recent Repository Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recent_activity.full_repo.length > 0 ? (
              data.recent_activity.full_repo.map((repo, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-900 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{repo.repo_name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <GitBranch className="h-3 w-3" />
                        {repo.branch}
                      </p>
                    </div>
                    <Badge className={getStatusColor(repo.state)}>
                      {repo.state}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Issues: {repo.total_github_issues_suggested} suggested, {repo.github_issues_opened} opened
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      PRs: {repo.total_pull_request_suggested} suggested, {repo.pull_request_opened} opened
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(repo.date)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent repository activity</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pull Request Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" />
            Recent Pull Request Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recent_activity.pull_request.length > 0 ? (
              data.recent_activity.pull_request.map((pr, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{pr.repo_name}</h4>
                    </div>
                    <Badge className={getStatusColor(pr.state)}>
                      {pr.state}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {pr.total_comments}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(pr.date)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent pull request activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};