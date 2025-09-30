export interface DashboardData {
  total_repo_added: number;
  full_repo_review: {
    total_reviews: number;
    total_github_issues_suggested: number;
    github_issues_opened: number;
    total_pull_request_suggested: number;
    pull_request_opened: number;
  };
  pr_review: {
    total_reviews: number;
    total_comments: number;
  };
  recent_activity: {
    pull_request: PullRequestActivity[];
    full_repo: FullRepoActivity[];
  };
}

export interface PullRequestActivity {
  repo_name: string;
  state: string;
  date: string;
  total_comments: number;
}

export interface FullRepoActivity {
  repo_name: string;
  branch: string;
  state: string;
  date: string;
  total_github_issues_suggested: number;
  github_issues_opened: number;
  total_pull_request_suggested: number;
  pull_request_opened: number;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}